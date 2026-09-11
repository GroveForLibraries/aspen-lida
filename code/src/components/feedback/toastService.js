import React from 'react';
import { VStack } from '@/components/ui/vstack';
import { logDebugMessage } from '../../util/logging.js';
import { ThemedToast as Toast, ThemedToastTitle as ToastTitle, ThemedToastDescription as ToastDescription } from '../themed/ThemedToast';

let globalToastInstance = null;

/**
 * Registers a global toast instance for displaying toast notifications.
 * @param toast
 */
export function registerGlobalToast(toast) {
     globalToastInstance = toast;
}

function buildToastRenderer(prefix, actionType, title, description) {
     return ({ id }) => {
          const uniqueToastId = `${prefix}-${id}`;
          return (
               <Toast nativeID={uniqueToastId} action={actionType} variant="accent" zIndex={9999} elevation={9999}>
                    <VStack space="xs">
                         <ToastTitle action={actionType}>{title}</ToastTitle>
                         {description && <ToastDescription>{description}</ToastDescription>}
                    </VStack>
               </Toast>
          );
     };
}

function showToast({
     level,
     idPrefix,
     title,
     description,
     status,
     duration,
}) {
     if (!globalToastInstance?.show) {
          logDebugMessage(`Toast instance is unavailable in ${level}`);
          return;
     }

     const actionType = status?.toLowerCase();
     const toastId = `${idPrefix}-${Date.now()}`;
     const render = buildToastRenderer(idPrefix, actionType, title, description);

     const showConfig = {
          id: toastId,
          placement: 'bottom',
          duration,
          render,
     };

     const shownId = globalToastInstance.show(showConfig);

     logDebugMessage(`${level} show returned id: ${shownId}`);
}

/**
 * Pops a toast notification with the specified title, description, and status.
 * @param title
 * @param description
 * @param status
 */
export function popToast(title, description, status) {
     logDebugMessage('Popping a toast');
     showToast({
          level: 'Toast',
          idPrefix: 'toast',
          title,
          description,
          status,
          duration: 3000,
     });
}

/**
 * Pops an alert toast notification with the specified title, description, and status.
 * @param title
 * @param description
 * @param status
 */
export function popAlert(title, description, status) {
     logDebugMessage('Popping an alert');
     showToast({
          level: 'Alert',
          idPrefix: 'alert',
          title,
          description,
          status,
          duration: 5000,
     });
}
