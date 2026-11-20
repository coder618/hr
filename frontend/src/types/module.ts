import { ComponentType, LazyExoticComponent } from 'react';

export interface RouteDefinition {
  path: string;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  permission?: string;
  role?: string;
  exact?: boolean;
}

export interface NavigationItem {
  name: string;
  path: string;
  icon: string;
  permission?: string;
  role?: string;
  badge?: string | number;
  children?: NavigationItem[];
  order?: number;
}

export interface ModuleConfig {
  id: string;
  name: string;
  description?: string;
  routes: RouteDefinition[];
  navigation: NavigationItem[];
  order?: number;
}
