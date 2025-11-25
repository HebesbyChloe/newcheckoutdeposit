'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-[#1d2939] group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[#667085]',
          actionButton:
            'group-[.toast]:bg-[#3d6373] group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-gray-100 group-[.toast]:text-[#1d2939]',
        },
      }}
      position="top-right"
      {...props}
    />
  );
};

export { Toaster };

