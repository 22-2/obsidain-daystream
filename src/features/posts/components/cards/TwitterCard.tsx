import type { TwitterMeta } from "src/core/meta";
import { Box, Image, Link, Text } from "src/core/ui/components/primitives";

export const TwitterCard = ({ meta }: { meta: TwitterMeta }) => {
  return (
    <Box className="daystream-html-card relative z-[1] border-dotted border-[#b5890077] backdrop-brightness-[101%] mb-[var(--size-4-4)] rounded-[16px] overflow-hidden transition-[backdrop-filter] duration-200 hover:cursor-pointer hover:border-[#b58900] hover:backdrop-brightness-[98%]">
      <Box className="daystream-html-card-content p-[var(--size-4-4)]">
        <Box className="daystream-html-card-header mb-[var(--size-4-2)] text-[var(--text-muted)] flex items-center">
          <Image
            src="https://abs.twimg.com/favicons/twitter.3.ico"
            className="daystream-html-card-site-icon object-contain h-[1em] mr-[var(--size-2-3)]"
          />
          <Text className="daystream-html-card-site-name h-[1em] leading-[1em]">X / Twitter</Text>
        </Box>
        <Box className="daystream-html-card-body" dangerouslySetInnerHTML={{ __html: meta.html }} />
      </Box>
      <Link
        href={meta.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-0 left-0 w-full h-full -indent-[9999px] z-[2]"
      />
    </Box>
  );
};
