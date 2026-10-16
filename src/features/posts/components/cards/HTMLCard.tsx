import { useState } from "react";
import type { HTMLMeta } from "src/core/meta";
import { Box, Image, Link, Text } from "src/core/ui/components/primitives";

export const HTMLCard = ({ meta }: { meta: HTMLMeta }) => {
  const [faviconUrl, setFaviconUrl] = useState(meta.faviconUrl);
  const handleFaviconImageError = () => {
    setFaviconUrl(
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PHBhdGggZD0iTTQxNC4zOSA5Ny43NEEyMjQgMjI0IDAgMSAwIDk3LjYxIDQxNC41MkEyMjQgMjI0IDAgMSAwIDQxNC4zOSA5Ny43NHpNNjQgMjU2LjEzYTE5MS42MyAxOTEuNjMgMCAwIDEgNi43LTUwLjMxYzcuMzQgMTUuOCAxOCAyOS40NSAyNS4yNSA0NS42NmM5LjM3IDIwLjg0IDM0LjUzIDE1LjA2IDQ1LjY0IDMzLjMyYzkuODYgMTYuMjEtLjY3IDM2LjcxIDYuNzEgNTMuNjdjNS4zNiAxMi4zMSAxOCAxNSAyNi43MiAyNGM4LjkxIDkuMDggOC43MiAyMS41MiAxMC4wOCAzMy4zNmEzMDUuMzYgMzA1LjM2IDAgMCAwIDcuNDUgNDEuMjdjMCAuMSAwIC4yMS4wOC4zMUMxMTcuOCA0MTEuMTMgNjQgMzM5LjggNjQgMjU2LjEzem0xOTIgMTkyYTE5My4xMiAxOTMuMTIgMCAwIDEtMzItMi42OGMuMTEtMi43MS4xNi01LjI0LjQzLTdjMi40My0xNS45IDEwLjM5LTMxLjQ1IDIxLjEzLTQzLjM1YzEwLjYxLTExLjc0IDI1LjE1LTE5LjY4IDM0LjExLTMzYzguNzgtMTMgMTEuNDEtMzAuNSA3Ljc5LTQ1LjY5Yy01LjMzLTIyLjQ0LTM1LjgyLTI5LjkzLTUyLjI2LTQyLjFjLTkuNDUtNy0xNy44Ni0xNy44Mi0zMC4yNy0xOC43Yy01LjcyLS40LTEwLjUxLjgzLTE2LjE4LS42M2MtNS4yLTEuMzUtOS4yOC00LjE1LTE0LjgyLTMuNDJjLTEwLjM1IDEuMzYtMTYuODggMTIuNDItMjggMTAuOTJjLTEwLjU1LTEuNDEtMjEuNDItMTMuNzYtMjMuODItMjMuODFjLTMuMDgtMTIuOTIgNy4xNC0xNy4xMSAxOC4wOS0xOC4yNmM0LjU3LS40OCA5LjctMSAxNC4wOS42OGM1Ljc4IDIuMTQgOC41MSA3LjggMTMuNyAxMC42NmM5LjczIDUuMzQgMTEuNy0zLjE5IDEwLjIxLTExLjgzYy0yLjIzLTEyLjk0LTQuODMtMTguMjEgNi43MS0yNy4xMmM4LTYuMTQgMTQuODQtMTAuNTggMTMuNTYtMjEuNjFjLS43Ni02LjQ4LTQuMzEtOS40MS0xLTE1Ljg2YzIuNTEtNC45MSA5LjQtOS4zNCAxMy44OS0xMi4yN2MxMS41OS03LjU2IDQ5LjY1LTcgMzQuMS0yOC4xNmMtNC41Ny02LjIxLTEzLTE3LjMxLTIxLTE4LjgzYy0xMC0xLjg5LTE0LjQ0IDkuMjctMjEuNDEgMTQuMTljLTcuMiA1LjA5LTIxLjIyIDEwLjg3LTI4LjQzIDNjLTkuNy0xMC41OSA2LjQzLTE0LjA2IDEwLTIxLjQ2YzEuNjUtMy40NSAwLTguMjQtMi43OC0xMi43NXE1LjQxLTIuMjggMTEtNC4yM2ExNS42IDE1LjYgMCAwIDAgOCAzYzYuNjkuNDQgMTMtMy4xOCAxOC44NCAxLjM4YzYuNDggNSAxMS4xNSAxMS4zMiAxOS43NSAxMi44OGM4LjMyIDEuNTEgMTcuMTMtMy4zNCAxOS4xOS0xMS44NmMxLjI1LTUuMTggMC0xMC42NS0xLjItMTZhMTkwLjgzIDE5MC44MyAwIDAgMSAxMDUgMzIuMjFjLTItLjc2LTQuMzktLjY3LTcuMzQuN2MtNi4wNyAyLjgyLTE0LjY3IDEwLTE1LjM4IDE3LjEyYy0uODEgOC4wOCAxMS4xMSA5LjIyIDE2Ljc3IDkuMjJjOC41IDAgMTcuMTEtMy44IDE0LjM3LTEzLjYyYy0xLjE5LTQuMjYtMi44MS04LjY5LTUuNDItMTEuMzdhMTkzLjI3IDE5My4yNyAwIDAgMSAxOCAxNC4xNGMtLjA5LjA5LS4xOC4xNy0uMjcuMjdjLTUuNzYgNi0xMi40NSAxMC43NS0xNi4zOSAxOC4wNWMtMi43OCA1LjE0LTUuOTEgNy41OC0xMS41NCA4LjkxYy0zLjEuNzMtNi42NCAxLTkuMjQgMy4wOGMtNy4yNCA1LjctMy4xMiAxOS40IDMuNzQgMjMuNTFjOC42NyA1LjE5IDIxLjUzIDIuNzUgMjguMDctNC42NmM1LjExLTUuOCA4LjEyLTE1Ljg3IDE3LjMxLTE1Ljg2YTE1LjQgMTUuNCAwIDAgMSAxMC44MiA0LjQxYzMuOCAzLjk0IDMuMDUgNy42MiAzLjg2IDEyLjU0YzEuNDMgOC43NCA5LjE0IDQgMTMuODMtLjQxYTE5Mi4xMiAxOTIuMTIgMCAwIDEgOS4yNCAxOC43N2MtNS4xNiA3LjQzLTkuMjYgMTUuNTMtMjEuNjcgNi44N2MtNy40My01LjE5LTEyLTEyLjcyLTIxLjMzLTE1LjA2Yy04LjE1LTItMTYuNS4wOC0yNC41NSAxLjQ3Yy05LjE1IDEuNTktMjAgMi4yOS0yNi45NCA5LjIyYy02LjcxIDYuNjgtMTAuMjYgMTUuNjItMTcuNCAyMi4zM2MtMTMuODEgMTMtMTkuNjQgMjcuMTktMTAuNyA0NS41N2M4LjYgMTcuNjcgMjYuNTkgMjcuMjYgNDYgMjZjMTkuMDctMS4yNyAzOC44OC0xMi4zMyAzOC4zMyAxNS4zOGMtLjIgOS44MSAxLjg1IDE2LjYgNC44NiAyNS43MWMyLjc5IDguNCAyLjYgMTYuNTQgMy4yNCAyNS4yMWExNTggMTU4IDAgMCAwIDQuNzQgMzAuMDdBMTkxLjc1IDE5MS43NSAwIDAgMSAyNTYgNDQ4LjEzeiIgZmlsbD0iY3VycmVudENvbG9yIj48L3BhdGg+PC9zdmc+",
    );
  };

  const [coverUrl, setCoverUrl] = useState(meta.coverUrl);
  const handleCoverImageError = () => {
    setCoverUrl(undefined);
  };

  return (
    <Box className="daystream-html-card relative z-[1] border-dotted border-[#b5890077] backdrop-brightness-[101%] mb-[var(--size-4-4)] rounded-[16px] overflow-hidden transition-[backdrop-filter] duration-200 hover:cursor-pointer hover:border-[#b58900] hover:backdrop-brightness-[98%]">
      {coverUrl && (
        <Image
          src={coverUrl}
          onError={handleCoverImageError}
          className="daystream-html-card-image w-full object-contain rounded-t-[16px]"
        />
      )}
      <Box className="daystream-html-card-content p-[var(--size-4-4)]">
        <Box className="daystream-html-card-header mb-[var(--size-4-2)] text-[var(--text-muted)] flex items-center">
          <Image
            src={faviconUrl}
            onError={handleFaviconImageError}
            className="daystream-html-card-site-icon object-contain h-[1em] mr-[var(--size-2-3)]"
          />
          <Text className="daystream-html-card-site-name h-[1em] leading-[1em]">{meta.siteName}</Text>
        </Box>
        <Box className="daystream-html-card-body mb-[var(--size-4-2)] font-semibold">{meta.title}</Box>
      </Box>
      <Link
        href={meta.originUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-0 left-0 w-full h-full -indent-[9999px] z-[2]"
      />
    </Box>
  );
};
