import { ImageUploadZone } from '@/components/upload/ImageUploadZone';
import { ToolPageLayout } from '@/components/layout/ToolPageLayout';

export default function Home() {
  return (
    <ToolPageLayout>
      <ImageUploadZone />
    </ToolPageLayout>
  );
}