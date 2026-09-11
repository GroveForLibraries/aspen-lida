import React from 'react';
import { useToast } from '@/components/ui/toast';
import { registerGlobalToast } from './toastService';

/**
 * ToastRegistrar component for registering a global toast instance.
 * @returns {null}
 * @constructor
 */
export const ToastRegistrar = () => {
     const toast = useToast();

     React.useEffect(() => {
          registerGlobalToast(toast);
     }, [toast]);

     return null;
};
