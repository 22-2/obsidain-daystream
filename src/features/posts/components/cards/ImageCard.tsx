import type { ImageMeta } from "src/core/meta";
import { Box, Image } from "src/core/ui/components/primitives";

export const ImageCard = ({ meta }: { meta: ImageMeta }) => {
  const url = window.URL || window.webkitURL;
  const src = url.createObjectURL(meta.data);
  return (
    <Box className="mfdi-image-card relative z-[1] backdrop-brightness-[101%] mb-[var(--size-4-4)]">
      <Image
        src={src}
        className="mfdi-image-card-image w-full max-h-[50vh] object-contain rounded-[16px]"
      />
    </Box>
  );
};
