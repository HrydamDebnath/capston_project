import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Button from '../common/Button.jsx';
import { Input } from '../common/Field.jsx';
import { useToast } from '../common/Toast.jsx';
import SoapTemplate from './SoapTemplate.jsx';
import useEntitlement from '../../hooks/useEntitlement.js';

const FORMATS = [
  { key: 'freeform', label: 'Freeform' },
  { key: 'soap', label: 'SOAP' },
  { key: 'dap', label: 'DAP' },
];

function ToolbarButton({ active, onClick, label, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold ${active ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-mist'}`}>
      {children}
    </button>
  );
}

function Toolbar({ editor }) {
  if (!editor) return null;
  const chain = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap gap-1 border-b border-line p-2">
      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>B</ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><span className="italic">I</span></ToolbarButton>
      <ToolbarButton label="Heading" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>H</ToolbarButton>
      <ToolbarButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>List</ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}>1.</ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}>Quote</ToolbarButton>
    </div>
  );
}

export default function NoteEditor({ note, clientId, onSaved, onCancel }) {
  const toast = useToast();
  const { can, get } = useEntitlement();
  const [title, setTitle] = useState(note ? note.title : '');
  const [type, setType] = useState(note ? note.type : 'private');
  const [format, setFormat] = useState(note ? note.format : 'freeform');
  const [sections, setSections] = useState(() => Object.fromEntries((note ? note.sections : []).map((section) => [section.key, section.value])));
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: note && note.format === 'freeform' ? note.content : '',
    editorProps: { attributes: { class: 'prose-note px-4 py-3', 'aria-label': 'Note content' } },
  });

  const chooseFormat = (key) => {
    if (!can(`notes.template.${key}`)) {
      const entitlement = get(`notes.template.${key}`);
      window.dispatchEvent(new CustomEvent('unfazed:upgrade', { detail: entitlement }));
      return;
    }
    setFormat(key);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      title: title.trim() || 'Untitled note',
      type,
      format,
      content: format === 'freeform' && editor ? editor.getHTML() : '',
      sections: format === 'freeform' ? [] : Object.entries(sections).map(([key, value]) => ({ key, value })),
    };
    try {
      const { data } = note ? await api.put(`/notes/${note._id}`, payload) : await api.post('/notes', { ...payload, clientId });
      toast.success(type === 'shared' ? 'Note saved and shared with the client' : 'Private note saved');
      onSaved(data.note);
    } catch (error) {
      if (!(error.response && error.response.data && error.response.data.code === 'UPGRADE_REQUIRED')) toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Session on 12 March" />

      <div>
        <p className="mb-1.5 text-sm font-semibold">Format</p>
        <div className="inline-flex rounded-xl bg-mist p-1" role="radiogroup" aria-label="Note format">
          {FORMATS.map((item) => {
            const locked = !can(`notes.template.${item.key}`);
            return (
              <button key={item.key} type="button" role="radio" aria-checked={format === item.key} onClick={() => chooseFormat(item.key)} className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold ${format === item.key ? 'bg-white shadow-sm' : 'text-muted hover:text-ink'}`}>
                {item.label}
                {locked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Locked"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {format === 'freeform' ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-soft">
          <Toolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      ) : (
        <SoapTemplate format={format} values={sections} onChange={setSections} />
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Who can read this</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['private', 'Only me', 'Never shown to the client, in the portal or anywhere else.'],
            ['shared', 'Share with client', 'Appears in their portal and they get an email.'],
          ].map(([key, label, text]) => (
            <label key={key} className={`cursor-pointer rounded-2xl border p-4 ${type === key ? 'border-brand bg-brand-soft/40' : 'border-line'}`}>
              <input type="radio" name="visibility" className="sr-only" checked={type === key} onChange={() => setType(key)} />
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-0.5 block text-xs text-muted">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save note</Button>
      </div>
    </div>
  );
}
