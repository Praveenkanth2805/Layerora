import { ToolPageLayout } from '@/components/layout/ToolPageLayout';
import { WatermarkRemoverUpload } from '@/components/upload/WatermarkRemoverUpload';

export default function WatermarkRemoverPage() {
  return (
    <ToolPageLayout>
      <WatermarkRemoverUpload />
    </ToolPageLayout>
  );
}