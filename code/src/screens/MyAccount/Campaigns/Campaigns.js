import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  Box,
  Button,
  ButtonText,
  Center,
  FlatList,
  HStack,
  Pressable,
  ScrollView,
  Text,
  VStack,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
  SelectScrollView,
  ChevronDownIcon,
  CheckIcon
} from '@gluestack-ui/themed';
import { fetchCampaigns, unenrollCampaign, enrollCampaign, optIntoCampaignEmails, optUserOutOfCampaignLeaderboard, optUserInToCampaignLeaderboard, addActivityProgress } from '../../../util/api/user';
import { getTermFromDictionary } from '../../../translations/TranslationService';

import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import PlaceholderImg from '../../../assets/digital-reward-placeholder.png';
import { logDebugMessage, logErrorMessage } from '../../../util/logging';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

// Constants
const PAGE_SIZE = 20;
const FILTER_OPTIONS = [
  { value: 'enrolled', labelKey: 'enrolled_campaigns' },
  { value: 'linkedUserCampaigns', labelKey: 'linked_user_campaigns' },
  { value: 'active', labelKey: 'active_campaigns' },
  { value: 'upcoming', labelKey: 'upcoming_campaigns' },
  { value: 'past', labelKey: 'past_campaigns' },
  { value: 'pastEnrolled', labelKey: 'past_enrolled_campaigns' }
];

const EMPTY_MESSAGES = {
  active: 'no_active_campaigns',
  enrolled: 'no_enrolled_campaigns',
  past: 'no_past_campaigns',
  upcoming: 'no_upcoming_campaigns',
  pastEnrolled: 'no_past_enrolled_campaigns',
  linkedUserCampaigns: 'no_linked_user_campaigns',
  default: 'no_campaigns'
};

export const MyCampaigns = () => {
	const navigation = useNavigation();
	const queryClient = useQueryClient();
	const library = useLibrary();
	const language = useActiveLanguage();
	const { theme, textColor, colorMode } = useTheme();

	React.useEffect(() => {
		queryClient.invalidateQueries(['all_campaigns']);
	}, [filterBy]);


	const [isLoading, setLoading] = React.useState(false);
	const [filterBy, setFilterBy] = React.useState('enrolled');
	const [page, setPage] = React.useState(1);
	const [campaigns, updateCampaigns] = React.useState([]);
	const [expandedCampaigns, setExpandedCampaigns] = React.useState({});
	const [selectedCampaign, setSelectedCampaign] = React.useState(null);
	const [showActionSheet, setShowActionSheet] = React.useState(false);
	const [selectedLinkedUserId, setSelectedLinkedUserId] = React.useState(null);



	React.useLayoutEffect(() => {
		navigation.setOptions({
			headerLeft: () => <Box /> });
	}, [navigation]);

	//Utility Functions
	const buildImageUrl = (imagePath) => {
		if (!imagePath || !library.baseUrl) return '';
		return `${library.baseUrl}${imagePath}?v=${Date.now()}`;
	};

	const formatDate = (dateString) => {
		return dateString ? new Date(dateString).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: '2-digit'
		}) : 'N/A';
	};

	const handleShareOnSocial = async (imageUrl) => {
		if (!imageUrl) return;

		const fileUri = FileSystem.documentDirectory + 'shared.jpg';

		try {
			const download = await FileSystem.downloadAsync(imageUrl, fileUri);

			if (!(await Sharing.isAvailableAsync())) {
			  console.error('Sharing is not available on this device');
			  return;
			}

			await Sharing.shareAsync(download.uri);
		} catch (err) {
			console.error('Sharing failed:', err);
		}
	};

	const groupByLinkedUser = (campaigns) => {
		if (!Array.isArray(campaigns)) return {};

		return campaigns.reduce((acc, campaign) => {
			if (!campaign) return acc;

			const userName = campaign.linkedUserName || 'UnknownUser';
			const userId = campaign.linkedUserId;

			if (!acc[userName]) {
				acc[userName] = { userId: userId, campaigns: [] };
			}

			acc[userName].campaigns.push({
				...campaign,
				linkedUserId: userId });
			return acc;
		}, {});
	};

	// Data fetching
	const { status, data, error, isFetching, refetch} = useQuery(
		['all_campaigns', library.baseUrl, language, filterBy, page],
		() => fetchCampaigns(page, PAGE_SIZE, filterBy, library.baseUrl),
		{
			placeholderData: () => ({ campaigns: campaigns}),
			keepPreviousData: true,
			staleTime: 1000,
			onSuccess: (data) => {
				if (data && data.campaigns) {
					updateCampaigns(data.campaigns);
				}
			},
		  	onSettled: () => setLoading(false),
               onError: (error) => {
                    logDebugMessage("Error searching for saved search");
                    logErrorMessage(error);
               }
		}
	);

	// Action handlers
	const handleEnrollUnenroll = async () => {
		if (!selectedCampaign) return;

		try {
			const linkedUserId = selectedLinkedUserId;

			if (selectedCampaign.enrolled) {
				await unenrollCampaign(selectedCampaign.id, linkedUserId, filterBy, library.baseUrl);
			} else {
				await enrollCampaign(selectedCampaign.id, linkedUserId, filterBy, library.baseUrl);
			}

			await refetch();
			handleCloseActions();
		} catch (error) {
			console.error("Error in enroll / unenroll: ", error);
		}
	};

	const handleEmailNotificationOptions = async () => {
		if (!selectedCampaign) return;

		try {
			const linkedUserId = selectedLinkedUserId;
			const optIn = selectedCampaign.optInToCampaignEmailNotifications ? 0 : 1;

			await optIntoCampaignEmails(selectedCampaign.id, linkedUserId, filterBy, optIn, library.baseUrl);

			await refetch();
			handleCloseActions();
		} catch (error) {
			console.error("Error in opt in / out of email notifications: ", error);
		}
	};

	const handleLeaderboardOptions = async () => {
		if (!selectedCampaign) return;

		try {
			const linkedUserId = selectedLinkedUserId;

			if (selectedCampaign.optInToCampaignLeaderboard) {
				await optUserOutOfCampaignLeaderboard(selectedCampaign.id, linkedUserId, filterBy, library.baseUrl);
			} else {
				await optUserInToCampaignLeaderboard(selectedCampaign.id, linkedUserId, filterBy, library.baseUrl);
			}

			await refetch();
			handleCloseActions();
		} catch (error) {
			console.error("Error in opt in / out of leaderboard: ", error);
		}
	};

	const toggleExpanded = (id) => {
		setExpandedCampaigns((prev) => ({
			...prev,
			[id]: !prev[id] }));
	};

	const handleOpenActions = (item, linkedUserId) => {
		setSelectedCampaign(item);
		setSelectedLinkedUserId(linkedUserId);
		setShowActionSheet(true);
	};

	const handleCloseActions = () => {
		setSelectedCampaign(null);
		setSelectedLinkedUserId(null);
		setShowActionSheet(false);
	};

	const RewardImage = ({ imageUrl, rewardName, canShare, onShare }) => {
		if (!imageUrl) return null;

		return (
			<VStack space="sm">
				<Image
					source={{ uri: imageUrl }}
					style={{ width: 100, height: 100 }}
				/>
					{canShare && onShare ? (
					<Pressable onPress={() => onShare(imageUrl)}>
						<Text color={textColor}>{getTermFromDictionary(language, 'share_on_social_media')}</Text>
					</Pressable>
				) : null}
			</VStack>
		);
	};

	const RewardDisplay = ({ item, imageUrl, type = 'campaign'}) => {
		const displayName = item.displayName === 1;
		let hasImage;
		let actualImageUrl = imageUrl;
		const isDigitalReward = item.rewardType === 1;

		// Check if we should show placeholder
		if (isDigitalReward) {
			if (item.isPlaceholderImage) {
				if (item.useTplPlaceholder) {
					return (
					<VStack space="sm">
					<Image
						source={PlaceholderImg}
						style={{ width: 100, height: 100 }}
					/>
				</VStack>
					);
				}
				// Use the placeholder image URL instead
				actualImageUrl = buildImageUrl(item.badgeImage);
				hasImage = true;
			} else {
				if (type === 'campaign') {
					hasImage = item.rewardExists && item.badgeImage;
				} else {
					hasImage = item.rewardExists && item.rewardImage;
				}
			}
		}

		const rewardName = item.rewardName || 'No Reward';
		const canShare = type === 'campaign'
			? (item.campaignRewardGiven || (item.awardAutomatically && item.campaignIsComplete))
			: type === 'milestone'
			? (item.milestoneRewardGiven || (item.awardAutomatically && item.milestoneIsComplete))
			: (item.rewardGiven || (item.awardAutomatically && item.isComplete));

		return (
			<Box flex={type === 'campaign' ? 3 : 1}>
				{displayName && rewardName && (
					<Text color={textColor}>
						{rewardName}
					</Text>
				)}
				{hasImage && actualImageUrl && (
					<>
						<RewardImage
							imageUrl={actualImageUrl}
							rewardName={rewardName}
							canShare={canShare && !item.isPlaceholderImage}
							onShare={handleShareOnSocial}
						/>
					</>
				)}
			</Box>
		);
	};


	const ActivityTable = ({ items, title, type, campaignId, linkedUserId, isEnrolled, campaignIsPast, campaignIsUpcoming }) => {

		if (!Array.isArray(items) || items.length === 0) {
			return null;
		}

		const handleAddProgress = async (item) => {
			try {
				const activityType = type === 'milestone' ? 'milestone' : 'extraCredit';

				await addActivityProgress(item.id, linkedUserId, activityType, filterBy, library.baseUrl, language, campaignId);

				await refetch()
			} catch (error) {
				console.error("Error adding progress: ", error);
			}
		}

		const shouldShowButton = (item) => {
			if (!isEnrolled || campaignIsPast || campaignIsUpcoming) {
				return false;
			}

			if (item.allowPatronProgressInput){
				return true;
			}

			return false;
		};


		const shouldDisableButton = (item) =>{
			if (type === 'milestone') {
				return item.isComplete && !item.progressBeyondOneHundredPercent;
			} else if (type === 'activity') {
				return item.isComplete;
			}
			return false;
		}

		return (
			<Box mt="$4">
				<Text fontWeight="$bold" fontSize="$md" mb="$2">
					{title}
				</Text>
				<VStack space="md">
     <HStack justifyContent="space-between" pb="$1" borderBottomWidth="$1">
						<Text flex={3} fontWeight="$bold">{getTermFromDictionary(language, 'activity_name')}</Text>
						<Text flex={2} fontWeight="$bold">{getTermFromDictionary(language, 'activity_goal')}</Text>
						<Text flex={2} fontWeight="$bold">{getTermFromDictionary(language, 'activity_reward')}</Text>
						<Text flex={2} fontWeight="$bold">{getTermFromDictionary(language, 'progress')}</Text>
					</HStack>

					{items.map((item, i) => {
						if (!item) return null;

						const imageUrl = buildImageUrl(item.rewardImage);
						const showButton = shouldShowButton(item);
						const isDisabled = shouldDisableButton(item);

						return(
							<HStack
								key={i}
								justifyContent="space-between"
								alignItems="center"
								space="md"
								borderBottomWidth="$1"
								borderBottomColor={colorMode === 'light' ? "$coolGray200" : "$coolGray500"}
								pl="$4"
								pr="$5"
								py="$2"
							>
								<Text flex={2}>
									{String(item.name || '')}
								</Text>
								<Text flex={1}>
									{String(item.completedGoals || 0)} / {String(item.totalGoals || 0)}
								</Text>
								<Box width={120}>
									<RewardDisplay
										item={item}
										imageUrl={imageUrl}
										type={type}
									/>
								</Box>
								<Box flex={1} alignItems="center">
									{!!showButton && (
										<Button
											size="sm"
											onPress={() => handleAddProgress(item)}
											isDisabled={isDisabled}
											opacity={isDisabled ? 0.5 : 1}
											width="100%"
											px={2}
										>
											<ButtonText fontSize="$xs" textAlign="center">
												{getTermFromDictionary(language, 'add_progress')}
											</ButtonText>
										</Button>
									)}
								</Box>
							</HStack>
						);
					})}
				</VStack>
			</Box>
		);
	};

	const renderCampaignItem = ({ item, onOpenActions, onToggle, expanded }) => {

		 if (!item) {
    		return null;
  		}

		const startDate = formatDate(item.startDate);
		const endDate = formatDate(item.endDate);
		const campaignImageUrl = buildImageUrl(item.badgeImage);
		const linkedUserIdForActivities = filterBy === 'linkedUserCampaigns' ? item.linkedUserId : null;
		const isUserEnrolled = item.enrolled || false;

		return (
			<VStack space="md" px="$4" py="$3" key={item.id}>
    <HStack justifyContent="space-between" borderBottomWidth="$1" pb="$2">
					<Text flex={2} fontWeight="$bold">{getTermFromDictionary(language, 'campaign_name_header')}</Text>
					<Text flex={3} fontWeight="$bold">{getTermFromDictionary(language, 'campaign_reward')}</Text>
					<Text flex={2} fontWeight="$bold">{getTermFromDictionary(language, 'campaign_dates')}</Text>
					<Text flex={1} fontWeight="$bold"> </Text>
					<Text flex={1} fontWeight="$bold"> </Text>
				</HStack>

				<HStack
					justifyContent="space-between"
					alignItems="center"
					py="$2"
					borderBottomWidth={0.5}
					borderColor="$coolGray200"
				>
					<Text flex={2}>
						{String(item.name || '')}
					</Text>
					<RewardDisplay
						item={item}
						imageUrl={campaignImageUrl}
						type="campaign"
					/>
					<Text flex={2} color={textColor}>
						{startDate} {'\n'} - {'\n'}{endDate}
					</Text>
					<Button
						onPress={onToggle}
						variant="link"
						flex={1}
						accessibilityLabel={expanded ? "Collapse campaign details" : "Expand campaign details"}
					>
						<ButtonText>
							{expanded ? "▲" : "▼"}
						</ButtonText>
					</Button>
					<Button
						size="sm"
						onPress={() => onOpenActions(item, filterBy === 'linkedUserCampaigns' ? item.linkedUserId : null)}
						accessibilityLabel={`Open actions menu for ${item.name || 'campaign'}`}
					>
						<ButtonText>{getTermFromDictionary(language, 'campaign_action_button')}</ButtonText>
					</Button>
				</HStack>

				{expanded && (
					<Box px="$2" py="$2" bg="$coolGray100" borderRadius="$md">
						{(!Array.isArray(item.milestones) || item.milestones.length === 0) && (!Array.isArray(item.extraCreditActivities) || item.extraCreditActivities.length === 0) ? (
							<Text color="$textLight900" fontStyle="italic">
								{getTermFromDictionary(language, 'no_activities_available')}
							</Text>
						) : (
							<>
								<ActivityTable
									items={item.milestones}
									title="Milestones"
									type="milestone"
									campaignId={item.id}
									linkedUserId={linkedUserIdForActivities}
									isEnrolled={isUserEnrolled}
									campaignIsPast={item.isPast}
									campaignIsUpcoming={item.isUpcoming}
								/>
								<ActivityTable
									items={item.extraCreditActivities}
									title="Extra Credit Activities"
									type="activity"
									campaignId={item.id}
									linkedUserId={linkedUserIdForActivities}
									isEnrolled={isUserEnrolled}
									campaignIsPast={item.isPast}
									campaignIsUpcoming={item.isUpcoming}
								/>
							</>
						)}
					</Box>
				)}
			</VStack>
		);
	};

	const renderActionSheet = () => {
		if (!selectedCampaign) return null;

		return (
			<Actionsheet isOpen={showActionSheet} onClose={handleCloseActions}>
				<ActionsheetBackdrop />
				<ActionsheetContent>
					<ActionsheetDragIndicatorWrapper>
						<ActionsheetDragIndicator />
					</ActionsheetDragIndicatorWrapper>

					{(selectedCampaign?.canEnroll || selectedCampaign?.enrolled) && (
						<ActionsheetItem onPress={handleEnrollUnenroll}>
							<ActionsheetItemText>
								{selectedCampaign?.enrolled ? 'Unenroll' : 'Enroll'}
							</ActionsheetItemText>
						</ActionsheetItem>
					)}
					{filterBy !== 'linkedUserCampaigns' && selectedCampaign?.enrolled && (
						<React.Fragment>
							<ActionsheetItem onPress={handleEmailNotificationOptions}>
								<ActionsheetItemText>
									{selectedCampaign?.optInToCampaignEmailNotifications ? 'Opt Out of Notifications' : 'Opt in to Notifications'}
								</ActionsheetItemText>
							</ActionsheetItem>
							{library?.displayCampaignLeaderboard && library?.campaignLeaderboardDisplay === 'displayUser' && (
								<ActionsheetItem onPress={handleLeaderboardOptions}>
									<ActionsheetItemText>
										{selectedCampaign?.optInToCampaignLeaderboard ? 'Opt Out of Leaderboard' : 'Opt in to Leaderboard'}
									</ActionsheetItemText>
								</ActionsheetItem>
							)}
						</React.Fragment>
					)}
					<ActionsheetItem onPress={handleCloseActions}>
						<ActionsheetItemText>{getTermFromDictionary(language, 'cancel')}</ActionsheetItemText>
					</ActionsheetItem>
				</ActionsheetContent>
			</Actionsheet>
		);
	};

	const EmptyComponent = () => (
		<Center mt="$5" mb="$5">
			<Text fontWeight="$bold" fontSize="$lg">
				{getTermFromDictionary(language, EMPTY_MESSAGES[filterBy] || EMPTY_MESSAGES.default)}
			</Text>
		</Center>
	);

	const campaignsData = useMemo(() => data?.campaigns || [], [data]);
	const groupedCampaigns = useMemo(() =>
		filterBy === 'linkedUserCampaigns' ? groupByLinkedUser(campaignsData) : {},
		[filterBy, campaignsData]
	);

	const getFilterLabel = (value) => {
		const option = FILTER_OPTIONS.find(opt => opt.value === value);
		return option ? getTermFromDictionary(language, option.labelKey) : 'Select Filter';
	};

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<Box px="$4" py="$3" bg="$coolGray100" borderBottomWidth="$1">
				<Select
					onValueChange={(itemValue) => setFilterBy(itemValue)}
				>
					<SelectTrigger variant="outline" size="md" w="$64">
						<SelectInput
                            py={0}
							placeholder="Select Filter"
							value={getFilterLabel(filterBy)}
						/>
						<SelectIcon mr="$3">
							<ChevronDownIcon />
						</SelectIcon>
					</SelectTrigger>
					<SelectPortal>
						<SelectBackdrop />
						<SelectContent>
							<SelectDragIndicatorWrapper>
								<SelectDragIndicator />
							</SelectDragIndicatorWrapper>
							<SelectScrollView>
								{FILTER_OPTIONS.map(option => (
									<SelectItem
										key={option.value}
										label={getTermFromDictionary(language, option.labelKey)}
										value={option.value}
									/>
								))}
							</SelectScrollView>
						</SelectContent>
					</SelectPortal>
				</Select>
			</Box>

			{status === 'loading' || isFetching ? (
				<Center flex={1}>
					<Text>{getTermFromDictionary(language, 'loading')}</Text>
				</Center>
			) : status === 'error' ? (
				<Center flex={1}>
					<Text>{getTermFromDictionary(language, 'campaign_loading_error')}</Text>
				</Center>
			) : campaignsData.length === 0 ? (
				<EmptyComponent />
			) : filterBy === 'linkedUserCampaigns' ? (
				<ScrollView>
					{Object.entries(groupedCampaigns).map(([userName, { userId, campaigns: groupedCampaignsList}]) => (
						<Box key={String(userId)} mb="$6">
							<Box px="$4" py="$2" bg="$coolGray200">
								<Text fontSize="$lg" fontWeight="$bold">
									{getTermFromDictionary(language, 'campaigns_for_linked_user')}: {String(userName)}
								</Text>
							</Box>

							{Array.isArray(groupedCampaignsList) && groupedCampaignsList.map((item) => {
								if (!item || !item.id) return null;

								return (
									<Box key={String(item.id)}>
										{renderCampaignItem({
											item,
											expanded: expandedCampaigns[item.id],
											onToggle: () => toggleExpanded(item.id),
											onOpenActions: () => handleOpenActions(item, userId) })}
									</Box>
								);
							})}
						</Box>
					))}
				</ScrollView>
			) : (
				<FlatList
					data={campaignsData}
					ListEmptyComponent={EmptyComponent}
					renderItem={({ item }) => {

						 if (!item) {
								return null;
							}

						if (!item) return null;

						return renderCampaignItem({
							item,
							expanded: expandedCampaigns[item.id],
							onToggle: () => toggleExpanded(item.id),
							onOpenActions: () => handleOpenActions(item, filterBy === 'linkedUserCampaigns' ? item.linkedUserId : null) });
					}}

					keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
					contentContainerStyle={{ paddingBottom: 30 }}
				/>
			)}

			{renderActionSheet()}
		</SafeAreaView>
	);
}
