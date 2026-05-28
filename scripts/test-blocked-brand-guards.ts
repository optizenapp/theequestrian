#!/usr/bin/env tsx
import {
  isBlockedBrandCandidate,
  isBlockedBrandHandle,
  isBlockedBrandName,
} from '@/lib/brands/blocked-brands';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  assert(isBlockedBrandHandle('rm-williams'), 'Expected rm-williams handle to be blocked');
  assert(
    isBlockedBrandHandle('/brands/rm-williams/'),
    'Expected brands URL-like rm-williams handle to be blocked'
  );
  assert(isBlockedBrandName('RM Williams'), 'Expected RM Williams to be blocked');
  assert(isBlockedBrandName('R.M. Williams'), 'Expected dotted RM Williams to be blocked');
  assert(isBlockedBrandName('RM Williamsn'), 'Expected typo variant RM Williamsn to be blocked');
  assert(isBlockedBrandHandle('penelope'), 'Expected penelope handle to be blocked');
  assert(
    isBlockedBrandHandle('/brands/penelope-leprevost/'),
    'Expected penelope-leprevost brands URL-like handle to be blocked'
  );
  assert(isBlockedBrandName('Penelope'), 'Expected Penelope to be blocked');
  assert(
    isBlockedBrandName('Penelope LePrevost'),
    'Expected Penelope LePrevost to be blocked'
  );
  assert(!isBlockedBrandName('Ariat'), 'Expected Ariat not to be blocked');

  const syncCandidates = [
    { name: 'RM Williams', handle: 'rm-williams' },
    { name: 'Penelope', handle: 'penelope' },
    { name: 'Ariat', handle: 'ariat' },
    { name: 'RM Williamsn', handle: 'rm-williamsn' },
    { name: 'Penelope LePrevost', handle: 'penelope-leprevost' },
  ];
  const allowedForSync = syncCandidates.filter(
    (row) => !isBlockedBrandCandidate({ handle: row.handle, brand: row.name })
  );
  assert(allowedForSync.length === 1, 'Expected only one sync candidate after block filtering');
  assert(allowedForSync[0]?.handle === 'ariat', 'Expected Ariat to remain syncable');

  const rollupParents = [
    { parent: 'RM Williams', hub: 'rm-williams' },
    { parent: 'Penelope', hub: 'penelope' },
    { parent: 'Ariat', hub: 'ariat' },
  ];
  const allowedRollupParents = rollupParents.filter(
    (row) => !isBlockedBrandCandidate({ handle: row.hub, brand: row.parent })
  );
  assert(allowedRollupParents.length === 1, 'Expected blocked parent brand to be excluded');
  assert(allowedRollupParents[0]?.parent === 'Ariat', 'Expected Ariat parent to remain allowed');

  console.log('Blocked brand guard checks passed.');
}

main();
