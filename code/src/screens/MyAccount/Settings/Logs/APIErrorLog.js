import React from 'react';
import { FlatList } from 'react-native';
import { clearApiErrorLogs, getApiErrorLogsPage } from '@/src/util/db';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { resolveUiColorMap, useTheme } from '@/src/themes/theme';
import { ThemedAccordion as Accordion, ThemedAccordionContent as AccordionContent, ThemedAccordionHeader as AccordionHeader, ThemedAccordionItem as AccordionItem, ThemedAccordionTrigger as AccordionTrigger, ThemedAccordionTitleText as AccordionTitleText, ThemedAccordionContentText as AccordionContentText, ThemedAccordionIcon as AccordionIcon } from '@/src/components/themed/ThemedAccordion';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../../components/themed/ThemedButton';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { Spinner } from '@/components/ui/spinner';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/* move this to the helpers.js */
function formatDate(ms) {
     try {
          return new Date(ms).toLocaleString();
     } catch {
          return String(ms);
     }
}

/**
 * APIErrorLog component that displays a list of API error logs. It fetches the logs from the database, allows pagination, and provides an option to clear the logs. Each log entry can be expanded to view the response body if available.
 * @param param0
 * @param param0.neutralPairs
 * @param param0.colorMode
 * @param param0.textColor
 * @returns {React.JSX.Element}
 * @constructor
 */
export const APIErrorLog = ({ neutralPairs: uiColorsProp, colorMode: colorModeProp, textColor: textColorProp } = {}) => {
     const [loading, setLoading] = React.useState(false);
     const [page, setPage] = React.useState(1);
     const [rows, setRows] = React.useState([]);
     const [meta, setMeta] = React.useState({
          total: 0,
          totalPages: 1,
          hasMore: false,
          hasPrevious: false });

     const language = useActiveLanguage();

     const themeCtx = useTheme() ?? {};
     const neutralPairs = uiColorsProp ?? themeCtx.neutralPairs ?? {};
     const colorMode = colorModeProp ?? themeCtx.colorMode ?? 'light';
     const textColor = textColorProp ?? themeCtx.textColor ?? '#111827';
     const neutrals = React.useMemo(() => resolveUiColorMap(neutralPairs, colorMode), [neutralPairs, colorMode]);
     const panelBg = neutrals.surface;
     const borderColor = neutrals.border;

     const loadPage = React.useCallback(async (nextPage = 1) => {
          setLoading(true);
          try {
               const result = await getApiErrorLogsPage({
                    page: nextPage,
                    pageSize: 25,
                    last24HoursOnly: true });

               setRows(result.items);
               setPage(result.page);
               setMeta({
                    total: result.total,
                    totalPages: result.totalPages,
                    hasMore: result.hasMore,
                    hasPrevious: result.hasPrevious });
          } finally {
               setLoading(false);
          }
     }, []);

     React.useEffect(() => {
          loadPage(1);
     }, [loadPage]);

     const onClear = async () => {
          setLoading(true);
          try {
               await clearApiErrorLogs();
               await loadPage(1);
          } finally {
               setLoading(false);
          }
     };

     const renderEntry = ({ item }) => (
          <Box className="px-4 py-3" style={{ borderBottomWidth: 1, borderColor }}>
               <VStack space="xs">
                    <Text size="xs">
                         {formatDate(item.created_at)}
                    </Text>
                    <Text bold size="sm">
                         {(item.method ?? 'UNKNOWN') + ' ' + (item.endpoint ?? '-')}
                    </Text>
                    <Text size="xs">
                         {'status=' + (item.status ?? 'n/a') + '  problem=' + (item.problem ?? 'n/a')}
                    </Text>
                    <Text>{item.requestParams}</Text>
                    {item.message ? (
                         <>
                              <Text size="xs">
                                   {item.message ?? ''}
                              </Text>
                         </>
                    ) : null}

                    {item.response_body ? (
                         <Accordion>
                             <AccordionItem value="response_body" style={{ backgroundColor: panelBg }}>
                                  <AccordionHeader style={{ backgroundColor: panelBg }}>
                                        <AccordionTrigger>
                                             {({ isExpanded }) => {
                                                  return (
                                                       <>
                                                            <AccordionTitleText style={{ color: textColor }}>Response</AccordionTitleText>
                                                            {isExpanded ? <AccordionIcon as={MaterialIcons} name="expand-less" className="ml-3" style={{ color: neutrals.actionableIndicator }} /> : <AccordionIcon as={MaterialIcons} name="expand-more" className="ml-3" style={{ color: neutrals.actionableIndicator }} />}
                                                       </>
                                                  );
                                             }}
                                        </AccordionTrigger>
                                   </AccordionHeader>
                                   <AccordionContent style={{ backgroundColor: panelBg }}>
                                        <AccordionContentText>
                                             <Text
                                                  style={{ fontFamily: 'Courier New, monospace', whiteSpace: 'pre-wrap' }} size="xs">
                                                  {(() => {
                                                       try {
                                                            const parsed = JSON.parse(item.response_body);
                                                            return JSON.stringify(parsed, null, 2);
                                                       } catch (error) {
                                                            return JSON.stringify(item.response_body, null, 2);
                                                       }
                                                  })()}
                                             </Text>
                                        </AccordionContentText>
                                   </AccordionContent>
                              </AccordionItem>
                         </Accordion>
                    ) : null}
               </VStack>
          </Box>
     );

     return (
          <Box className="flex-1">
               <Box className="px-4 py-3" style={{ borderBottomWidth: 1, borderColor }}>
                   <Heading size="sm">
                         {getTermFromDictionary(language, 'api_error_log')}
                    </Heading>
                    <Text size="xs">
                         {getTermFromDictionary(language, 'total') + ': ' + meta.total}
                    </Text>
               </Box>

               {loading && rows.length === 0 ? (
                    <Box className="flex-1 items-center justify-center">
                         <Spinner color={textColor} />
                    </Box>
               ) : (
                    <FlatList
                         data={rows}
                         keyExtractor={(item) => String(item.id)}
                         renderItem={renderEntry}
                         ListEmptyComponent={
                              <Box className="px-4 py-6 items-center">
                                   <Text>{getTermFromDictionary(language, 'api_error_log_empty')}</Text>
                              </Box>
                         }
                    />
               )}

               <HStack className="px-4 py-3" style={{ justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor }}>
                    <Button colorScheme="secondary" onPress={() => loadPage(page - 1)} isDisabled={loading || !meta.hasPrevious}>
                        <ButtonText>{getTermFromDictionary(language, 'previous')}</ButtonText>
                    </Button>

                    <Text size="xs">{`Page ${page} / ${meta.totalPages}`}</Text>

                    <Button colorScheme="secondary" onPress={() => loadPage(page + 1)} isDisabled={loading || !meta.hasMore}>
                        <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                    </Button>
               </HStack>

               <Box className="px-4 pb-3">
                    <Button variant="outline" colorScheme="tertiary" onPress={onClear} isDisabled={loading}>
                        <ButtonText>{getTermFromDictionary(language, 'clear_api_error_log')}</ButtonText>
                    </Button>
               </Box>
          </Box>
     );
};

/**
 * Generate a preview string for a value, truncating if it exceeds the specified max length.
 * @param value
 * @param max
 * @returns {string|string|string}
 */
function preview(value, max = 200) {
     if (value == null) return '';
     const s = typeof value === 'string' ? value : JSON.stringify(value);
     return s.length > max ? `${s.slice(0, max)}...` : s;
}
