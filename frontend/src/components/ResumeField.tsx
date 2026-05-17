import { useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { downloadApplicationResume } from '../lib/download-resume';
import { validateResumeFile } from '../lib/resume-validation';
import { useDeleteResume, useUploadResume } from '../hooks/use-resume';
import { Button } from './Button';

type PendingProps = {
  mode: 'pending';
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
};

type LiveProps = {
  mode: 'live';
  applicationId: string;
  company: string;
  title: string;
  hasResume: boolean;
};

export type ResumeFieldProps = PendingProps | LiveProps;

export function ResumeField(props: ResumeFieldProps) {
  if (props.mode === 'pending') {
    return <PendingResumeField {...props} />;
  }
  return <LiveResumeField {...props} />;
}

function PendingResumeField({
  file,
  onFileChange,
  error: externalError,
}: PendingProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | undefined>();

  async function handleFileChange(selected: File | null) {
    if (!selected) {
      onFileChange(null);
      setLocalError(undefined);
      return;
    }
    const validationError = await validateResumeFile(selected);
    if (validationError) {
      setLocalError(validationError);
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setLocalError(undefined);
    onFileChange(selected);
  }

  const error = externalError ?? localError;

  return (
    <ResumeFieldShell
      inputRef={inputRef}
      error={error}
      onPick={() => inputRef.current?.click()}
      onInputChange={(e) => {
        const selected = e.target.files?.[0] ?? null;
        void handleFileChange(selected);
      }}
      disabled={false}
      uploading={false}
    >
      {file ? (
        <p className="text-sm text-neutral-600">
          Selected: <span className="font-medium text-neutral-800">{file.name}</span>
        </p>
      ) : (
        <p className="text-sm text-neutral-500">No file selected</p>
      )}
      {file ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onFileChange(null);
            setLocalError(undefined);
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          Clear
        </Button>
      ) : null}
    </ResumeFieldShell>
  );
}

function LiveResumeField({
  applicationId,
  company,
  title,
  hasResume,
}: LiveProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadResume();
  const deleteMutation = useDeleteResume();
  const [localError, setLocalError] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);

  async function handleFileChange(selected: File | null) {
    if (!selected) return;
    const validationError = await validateResumeFile(selected);
    if (validationError) {
      setLocalError(validationError);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setLocalError(undefined);
    try {
      await uploadMutation.mutateAsync({ id: applicationId, file: selected });
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDownload() {
    setLocalError(undefined);
    setDownloading(true);
    try {
      await downloadApplicationResume(applicationId, company, title);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function handleRemove() {
    if (!confirm('Remove the uploaded resume?')) return;
    setLocalError(undefined);
    try {
      await deleteMutation.mutateAsync(applicationId);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : 'Remove failed');
    }
  }

  const uploading = uploadMutation.isPending;
  const removing = deleteMutation.isPending;

  return (
    <ResumeFieldShell
      inputRef={inputRef}
      error={localError}
      onPick={() => inputRef.current?.click()}
      onInputChange={(e) => {
        const selected = e.target.files?.[0] ?? null;
        void handleFileChange(selected);
      }}
      disabled={uploading || removing}
      uploading={uploading}
    >
      {hasResume ? (
        <p className="text-sm text-neutral-600">Resume attached</p>
      ) : (
        <p className="text-sm text-neutral-500">No resume uploaded</p>
      )}
      <div className="flex flex-wrap gap-2">
        {hasResume ? (
          <Button
            type="button"
            variant="secondary"
            disabled={downloading || uploading || removing}
            onClick={() => void handleDownload()}
          >
            {downloading ? 'Downloading…' : 'Download'}
          </Button>
        ) : null}
        {hasResume ? (
          <Button
            type="button"
            variant="danger"
            disabled={removing || uploading}
            onClick={() => void handleRemove()}
          >
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        ) : null}
      </div>
    </ResumeFieldShell>
  );
}

function ResumeFieldShell({
  inputRef,
  error,
  onPick,
  onInputChange,
  disabled,
  uploading,
  children,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  error?: string;
  onPick: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  uploading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-neutral-700">Resume (PDF)</span>
        <p className="text-xs text-neutral-500">Optional. Max 5 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={onInputChange}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">{children}</div>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={onPick}
          className="shrink-0"
        >
          {uploading ? 'Uploading…' : 'Choose file'}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
