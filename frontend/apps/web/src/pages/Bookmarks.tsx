import { useParams } from 'react-router';
import { PageHeader } from '@platform/ui';
import { BookmarkList } from '@/components/Bookmarks';

/** Every bookmark (ready-made treatment) of the branch: read, make, change, delete. */
export function BookmarksPage() {
  const { branch } = useParams();
  return (
    <div>
      <PageHeader title="Bookmarks" description="Ready-made treatments: medicines with dose, days and instructions, added to a patient in one step." />
      <BookmarkList branch={branch!} />
    </div>
  );
}
