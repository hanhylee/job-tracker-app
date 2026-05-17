import { fetchResumeBlob } from '../api/resume';
import { resumeDownloadFilename } from './resume-filename';

export async function downloadApplicationResume(
  applicationId: string,
  company: string,
  title: string,
): Promise<void> {
  const blob = await fetchResumeBlob(applicationId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = resumeDownloadFilename(company, title);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
