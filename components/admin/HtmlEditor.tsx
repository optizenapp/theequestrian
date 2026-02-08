'use client';

import { Editor } from '@tinymce/tinymce-react';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function HtmlEditor({ value, onChange, height = 320 }: HtmlEditorProps) {
  return (
    <Editor
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
