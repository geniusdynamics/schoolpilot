import { useAppData } from '../../../contexts/AppDataContext';

export const useGeneralLedgerEntryData = () => {
  const { generalledgerentrys, addGeneralLedgerEntry, updateGeneralLedgerEntry, deleteGeneralLedgerEntry } = useAppData();
  
  return {
    data: generalledgerentrys,
    create: addGeneralLedgerEntry,
    update: updateGeneralLedgerEntry,
    remove: deleteGeneralLedgerEntry
  };
};
