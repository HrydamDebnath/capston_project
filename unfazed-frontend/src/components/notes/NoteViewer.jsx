import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichTextView({ html }) {
  const editor = useEditor({ extensions: [StarterKit], content: html || '', editable: false }, []);

  useEffect(() => {
    if (editor && html !== undefined && editor.getHTML() !== html) editor.commands.setContent(html || '', false);
  }, [editor, html]);

  return <EditorContent editor={editor} className="prose-note [&_.ProseMirror]:min-h-0" />;
}

export default function NoteViewer({ note }) {
  if (note.format === 'freeform') return <RichTextView html={note.content} />;
  return (
    <div className="space-y-4">
      {note.sections.map((section) => (
        <div key={section.key}>
          <h4 className="text-sm font-bold">{section.label}</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{section.value || 'Nothing recorded'}</p>
        </div>
      ))}
    </div>
  );
}
