export const REQUIRE_FEATURE_KEY = 'billing:requireFeature';

export type RequiredFeatureMetadata = {
  feature: string;
  errorMessage?: string;
};
