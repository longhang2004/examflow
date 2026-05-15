import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { FeatureGateGuard } from './feature-gate.guard';
import { REQUIRE_FEATURE_KEY } from './feature-gate.constants';

export function RequireFeature(feature: string, errorMessage?: string) {
  return applyDecorators(
    SetMetadata(REQUIRE_FEATURE_KEY, { feature, errorMessage }),
    UseGuards(FeatureGateGuard),
  );
}
