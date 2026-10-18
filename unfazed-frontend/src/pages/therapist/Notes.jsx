import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Loader from '../../components/common/Loader.jsx';
import Modal from '../../components/common/Modal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import NoteEditor from '../../components/notes/NoteEditor.jsx';
import NoteViewer from '../../components/notes/NoteViewer.jsx';
import { formatDate } from '../../utils/format.js';

export default function Notes() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const clientId = params.get('client') || '';
  const [clients, setClients] = useState(null);
  const [notes, setNotes] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    api
      .get('/clients', { params: { limit: 100, sort: 'name', order: 'asc' } })
      .then(({ data }) => setClients(data.clients))
      .catch((error) => toast.error(getErrorMessage(error)));
  }, [toast]);

  const loadNotes = useCallback(async () => {
    if (!clientId) return;
    setNotes(null);
    try {
      const { data } = await api.get('/notes', { params: { clientId } });
      setNotes(data.notes);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [clientId, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedClient = clients && clients.find((item) => item._id === clientId);

  const toggleShare = async (note) => {
    try {
      await api.put(`/notes/${note._id}`, { type: note.type === 'private' ? 'shared' : 'private' });
      toast.success(note.type === 'private' ? 'Shared with client' : 'Now private');
      loadNotes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/notes/${toDelete._id}`);
      setToDelete(null);
      toast.success('Note deleted');
      loadNotes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Private notes stay with you. Shared notes appear in the client portal."
        actions={selectedClient && <Button onClick={() => setEditing({})}>New note</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="card max-h-[70vh] overflow-y-auto p-2">
          {!clients ? (
            <Loader label="Loading clients" />
          ) : clients.length === 0 ? (
            <p className="p-4 text-sm text-muted">Add a client to start writing notes.</p>
          ) : (
            clients.map((client, index) => (
              <button
                key={client._id}
                type="button"
                onClick={() => setParams({ client: client._id })}
                aria-current={client._id === clientId ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${client._id === clientId ? 'bg-brand-soft' : 'hover:bg-mist'}`}
              >
                <Avatar name={client.name} size={34} shape={index} />
                <span className="truncate text-sm font-semibold">{client.name}</span>
              </button>
            ))
          )}
        </aside>

        <section className="space-y-4">
          {!clientId ? (
            <div className="card"><EmptyState title="Choose a client" message="Pick someone from the list to read or write their notes." /></div>
          ) : !notes ? (
            <Loader label="Loading notes" />
          ) : notes.length === 0 ? (
            <div className="card"><EmptyState title="No notes yet" message="Capture what happened in a session, or write something to share." action={<Button onClick={() => setEditing({})}>Write first note</Button>} /></div>
          ) : (
            notes.map((note) => (
              <article key={note._id} className="card p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{note.title}</h3>
                    <p className="mt-0.5 text-xs text-muted">Updated {formatDate(note.updatedAt)} · {note.format === 'freeform' ? 'Freeform' : note.format.toUpperCase()}</p>
                  </div>
                  <Badge tone={note.type === 'private' ? 'neutral' : 'brand'}>{note.type === 'private' ? 'Only you' : 'Shared with client'}</Badge>
                </div>
                <NoteViewer note={note} />
                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button size="sm" variant="outline" onClick={() => setEditing(note)}>Edit</Button>
                  <Button size="sm" variant="soft" onClick={() => toggleShare(note)}>{note.type === 'private' ? 'Share with client' : 'Make private'}</Button>
                  <Button size="sm" variant="danger" onClick={() => setToDelete(note)}>Delete</Button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing && editing._id ? 'Edit note' : `New note for ${selectedClient ? selectedClient.name : 'client'}`} width="max-w-3xl">
        {editing && <NoteEditor key={editing._id || 'new'} note={editing._id ? editing : null} clientId={clientId} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); loadNotes(); }} />}
      </Modal>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this note?" description="This cannot be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setToDelete(null)}>Keep note</Button>
          <Button variant="danger" onClick={remove}>Delete note</Button>
        </div>
      </Modal>
    </div>
  );
}
