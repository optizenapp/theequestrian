'use client';

import dynamic from 'next/dynamic';

const TinyMCEEditor = dynamic(
  async () => {
    const mod = await import('@tinymce/tinymce-react');
    return mod.Editor;
  },
  {
    ssr: false,
    loading: () => <div className="h-80 w-full animate-pulse rounded-md bg-gray-100" />,
  }
);

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function HtmlEditor({ value, onChange, height = 320 }: HtmlEditorProps) {
  return (
    <TinyMCEEditor
      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || ''}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height,
        menubar: false,
        plugins: [
          'advlist',
          'autolink',
          'lists',
          'link',
          'charmap',
          'preview',
          'anchor',
          'searchreplace',
          'visualblocks',
          'code',
          'fullscreen',
          'insertdatetime',
          'table',
          'help',
          'wordcount',
        ],
        toolbar:
          'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link table | code',
        content_style: 'body { font-family: Inter, sans-serif; font-size: 14px; }',
      }}
    />
  );
}
