// import {

interface TopicAddFormProps {
  newTitle: string;
  newId: string;
  idError: string;
  onTitleChange: (v: string) => void;
  onIdChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const TopicAddForm = ({
  newTitle,
  newId,
  idError,
  onTitleChange,
  onIdChange,
  onSubmit,
  onCancel,
}: TopicAddFormProps) => {
  return null;
  // return (
  //   <Box
  //     className={cn(
  //       "mt-[var(--size-4-3)] p-[var(--size-4-3)] rounded-[var(--radius-m)]",
  //       "border border-[var(--background-modifier-border)] bg-[var(--background-secondary)]"
  //     )}
  //   >
  //     <VStack className={cn("flex flex-col items-stretch space-y-[var(--size-4-2)]")}>
  //       <FormControl>
  //         <FormLabel
  //           className={cn(
  //             "text-[length:var(--font-ui-smaller)] text-[var(--text-muted)] mb-[2px] block"
  //           )}
  //         >
  //           タイトル
  //         </FormLabel>
  //         <Input
  //           className={cn("text-sm")}
  //           placeholder="例: 小説"
  //           value={newTitle}
  //           onChange={(e) => onTitleChange(e.target.value)}
  //           autoFocus
  //         />
  //       </FormControl>

  //       <FormControl isInvalid={!!idError}>
  //         <FormLabel
  //           className={cn(
  //             "text-[length:var(--font-ui-smaller)] text-[var(--text-muted)] mb-[2px] block"
  //           )}
  //         >
  //           ID{" "}
  //           <Text as="span" className={cn("text-[length:var(--font-ui-smaller)] text-[var(--text-faint)]")}>
  //             (作成後変更不可)
  //           </Text>
  //         </FormLabel>
  //         <Input
  //           className={cn("text-[length:var(--font-ui-smaller)] font-mono")}
  //           placeholder="例: novel"
  //           value={newId}
  //           onChange={(e) => onIdChange(e.target.value)}
  //           onKeyDown={(e) => {
  //             if (e.key === "Enter") onSubmit();
  //             if (e.key === "Escape") onCancel();
  //           }}
  //         />
  //         {idError ? (
  //           <FormErrorMessage className={cn("text-[length:var(--font-ui-smaller)] mt-1")}>
  //             {idError}
  //           </FormErrorMessage>
  //         ) : (
  //           <FormHelperText
  //             className={cn("text-[length:var(--font-ui-smaller)] text-[var(--text-faint)] mt-1")}
  //           >
  //             英小文字・数字・ハイフンのみ。ファイル名のプレフィックスになります。
  //           </FormHelperText>
  //         )}
  //       </FormControl>

  //       <HStack className={cn("flex flex-row items-center justify-end space-x-[var(--size-4-2)]")}>
  //         <Button
  //           onClick={onCancel}
  //           className={cn(
  //             "text-sm bg-transparent hover:bg-[var(--background-modifier-hover)] transition-colors"
  //           )}
  //         >
  //           キャンセル
  //         </Button>
  //         <Button
  //           onClick={onSubmit}
  //           className={cn(
  //             "text-sm bg-[var(--color-accent)] text-[var(--text-on-accent)]",
  //             "hover:bg-[var(--color-accent-2)] transition-colors"
  //           )}
  //         >
  //           追加
  //         </Button>
  //       </HStack>
  //     </VStack>
  //   </Box>
  // );
};
