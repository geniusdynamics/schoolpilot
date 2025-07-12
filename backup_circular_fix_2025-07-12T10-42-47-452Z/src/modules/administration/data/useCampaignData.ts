import { useAppData } from '../../../contexts/AppDataContext';

export const useCampaignData = () => {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useAppData();
  
  return {
    data: campaigns,
    create: addCampaign,
    update: updateCampaign,
    remove: deleteCampaign
  };
};
