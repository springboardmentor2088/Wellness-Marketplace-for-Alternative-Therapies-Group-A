import React from 'react';
import WalletWidget from './WalletWidget';
import NotificationDropdown from './NotificationDropdown';

const PractitionerHeader = () => {
  return (
    <div className="flex justify-end items-center mb-10 gap-6">
      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-2">
        <WalletWidget />
        <div className="h-8 w-px bg-slate-100 mx-2"></div>
        <NotificationDropdown />
      </div>
    </div>
  );
};

export default PractitionerHeader;
