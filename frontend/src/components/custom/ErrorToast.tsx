// components/ErrorToast.tsx

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { clearError } from '@/features/errorSlice';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function ErrorToast() {
  const errorMessage = useAppSelector(state => state.error.message);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  useEffect(() => {
    if (errorMessage) {
      // Display the toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 3000,
      });

      // Clear the error after displaying
      dispatch(clearError());
    }
  }, [errorMessage, dispatch, toast]);

  return null; // This component doesn't render any UI
}
