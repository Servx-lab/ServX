import React from 'react';

export interface ServiceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  url: string | null;
  updatedAt: number;
}

export interface DeploymentItem {
  id: string;
  name: string;
  url: string | null;
  state: string;
  created: number;
  commit: string | null;
  branch: string | null;
}

export interface ProviderUser {
  username: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ProviderConfig {
  key: string;
  label: string;
  tokenLabel: string;
  placeholder: string;
  tokenPageUrl: string;
  tokenPageLabel: string;
  description: string;
  guideTitle: string;
  guideSubtitle: string;
  steps: { title: string; detail: string }[];
  features: string[];
  logo: React.ReactNode;
  logoSmall: React.ReactNode;
}
