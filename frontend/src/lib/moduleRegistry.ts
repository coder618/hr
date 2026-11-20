import { ModuleConfig, NavigationItem, RouteDefinition } from '@/types/module';

class ModuleRegistry {
  private modules: Map<string, ModuleConfig> = new Map();

  public register(config: ModuleConfig): void {
    this.modules.set(config.id, config);
  }

  public getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }

  public getAllModules(): ModuleConfig[] {
    return Array.from(this.modules.values()).sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  /**
   * Filter routes based on organization enabled modules and user role/permissions
   */
  public getEnabledRoutes(
    enabledModuleIds: string[],
    isSuperAdmin = false,
    hasRole?: (role?: string) => boolean,
    hasPermission?: (perm?: string) => boolean
  ): RouteDefinition[] {
    const routes: RouteDefinition[] = [];

    for (const [id, config] of this.modules.entries()) {
      // Core module is always enabled; other modules checked against enabledModuleIds
      if (id === 'core' || isSuperAdmin || enabledModuleIds.includes(id)) {
        for (const route of config.routes) {
          const roleOk = !hasRole || hasRole(route.role);
          const permOk = !hasPermission || hasPermission(route.permission);
          if (roleOk && permOk) {
            routes.push(route);
          }
        }
      }
    }

    return routes;
  }

  /**
   * Filter sidebar navigation based on enabled modules and user permissions
   */
  public getEnabledNavigation(
    enabledModuleIds: string[],
    hasPermission: (perm?: string) => boolean,
    hasRole: (role?: string) => boolean,
    isSuperAdmin = false
  ): NavigationItem[] {
    const navigation: NavigationItem[] = [];
    const modules = this.getAllModules();

    for (const config of modules) {
      if (config.id === 'core' || isSuperAdmin || enabledModuleIds.includes(config.id)) {
        for (const item of config.navigation) {
          if (hasPermission(item.permission) && hasRole(item.role)) {
            const itemCopy = { ...item };
            if (itemCopy.order === undefined) {
              itemCopy.order = (config.order || 50) * 10;
            }
            if (item.children) {
              itemCopy.children = item.children.filter(
                (child) => hasPermission(child.permission) && hasRole(child.role)
              );
              if (item.children.length > 0 && itemCopy.children.length === 0) {
                continue;
              }
            }
            navigation.push(itemCopy);
          }
        }
      }
    }

    return navigation.sort((a, b) => (a.order || 500) - (b.order || 500));
  }
}

export const moduleRegistry = new ModuleRegistry();
