import { useCallback, useMemo, useState } from "react";
import type { DSTRStorage } from "src/core/storage";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";

type UseCollapsedGroupsInput = {
  storage: DSTRStorage;
  canCollapseDividers: boolean;
};

type UseCollapsedGroupsOutput = {
  collapsedGroupSet: Set<string>;
  toggleCollapsedGroup: (groupKey: string) => void;
  collapseGroups: (groupKeys: string[]) => void;
  expandGroups: (groupKeys: string[]) => void;
};

export function useCollapsedGroups({
  storage,
  canCollapseDividers,
}: UseCollapsedGroupsInput): UseCollapsedGroupsOutput {
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<string[]>(() =>
    // 意図: 旧保存値にある日付グループを除外し、ピン留めの開閉状態だけ復元する。
    storage.get<string[]>(STORAGE_KEYS.COLLAPSED_POST_GROUP_KEYS, []).filter((k) => k === "pinned"),
  );

  const collapsedGroupSet = useMemo(() => new Set(collapsedGroupKeys), [collapsedGroupKeys]);

  // 意図: 更新と永続化を一箇所に集約し、状態の書き漏れを防ぐ。
  const persistAndUpdate = useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      setCollapsedGroupKeys((prev) => {
        const next = [...updater(new Set(prev))];
        storage.set(
          STORAGE_KEYS.COLLAPSED_POST_GROUP_KEYS,
          next.filter((k) => k === "pinned"),
        );
        return next;
      });
    },
    [storage],
  );

  const toggleCollapsedGroup = useCallback(
    (groupKey: string) => {
      if (!canCollapseDividers) return;
      persistAndUpdate((set) => {
        const next = new Set(set);
        if (next.has(groupKey)) next.delete(groupKey);
        else next.add(groupKey);
        return next;
      });
    },
    [canCollapseDividers, persistAndUpdate],
  );

  const collapseGroups = useCallback(
    (groupKeys: string[]) => {
      if (!canCollapseDividers) return;
      persistAndUpdate((set) => {
        const next = new Set(set);
        groupKeys.forEach((k) => next.add(k));
        return next;
      });
    },
    [canCollapseDividers, persistAndUpdate],
  );

  const expandGroups = useCallback(
    (groupKeys: string[]) => {
      if (!canCollapseDividers) return;
      persistAndUpdate((set) => {
        const next = new Set(set);
        groupKeys.forEach((k) => next.delete(k));
        return next;
      });
    },
    [canCollapseDividers, persistAndUpdate],
  );

  return {
    collapsedGroupSet,
    toggleCollapsedGroup,
    collapseGroups,
    expandGroups,
  };
}
