import { useAppData } from '../../../contexts/AppDataContext';

export const useMenuData = () => {
  const { menus, addMenu, updateMenu, deleteMenu } = useAppData();
  
  return {
    data: menus,
    create: addMenu,
    update: updateMenu,
    remove: deleteMenu
  };
};
