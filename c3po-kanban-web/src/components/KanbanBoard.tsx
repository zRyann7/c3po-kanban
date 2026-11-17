import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import type { Task, TaskPriority, TaskStatus } from '../types/task';

interface KanbanBoardProps {
  userId: string;
}

const COLUMNS: { id: TaskStatus; title: string; icon: React.ReactNode }[] = [
  {
    id: 'todo',
    title: 'A Fazer',
    icon: <Circle className="h-4 w-4 text-zinc-400" />,
  },
  {
    id: 'in_progress',
    title: 'Em Progresso',
    icon: <Clock className="h-4 w-4 text-amber-400" />,
  },
  {
    id: 'done',
    title: 'Concluído',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  },
];

const PRIORITY_STYLES: Record<TaskPriority, { label: string; classes: string }> = {
  low: { label: 'Baixa', classes: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  medium: { label: 'Média', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  high: { label: 'Alta', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  urgent: { label: 'Urgente', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export function KanbanBoard({ userId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(tasksRef, orderBy('position', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Task[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Task, 'id'>),
      }));
      setTasks(items);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    try {
      const maxPos = tasks.reduce((max, t) => Math.max(max, t.position || 0), 0);
      await addDoc(collection(db, 'users', userId, 'tasks'), {
        title: trimmed,
        description: '',
        status: 'todo',
        priority: newPriority,
        position: maxPos + 1000,
        tags: [],
        created_by_agent: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      setNewTitle('');
    } finally {
      setAdding(false);
    }
  };

  const handleMoveStatus = async (taskId: string, newStatus: TaskStatus) => {
    const ref = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(ref, {
      status: newStatus,
      updated_at: serverTimestamp(),
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    const ref = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(ref);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Barra de criação rápida */}
      <form
        onSubmit={handleAddTask}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Adicionar nova tarefa rapidamente..."
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none"
          >
            <option value="low">Prioridade: Baixa</option>
            <option value="medium">Prioridade: Média</option>
            <option value="high">Prioridade: Alta</option>
            <option value="urgent">Prioridade: Urgente</option>
          </select>
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </form>

      {/* Colunas do Kanban */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4 min-h-[500px]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-sm font-semibold text-zinc-200">{col.title}</h3>
                </div>
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                {colTasks.map((task) => {
                  const prio = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;
                  return (
                    <div
                      key={task.id}
                      className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm hover:border-zinc-700 transition-all"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${prio.classes}`}
                          >
                            {prio.label}
                          </span>
                          {task.created_by_agent && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                              <Bot className="h-3 w-3" /> C-3PO
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="rounded p-1 text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-red-400 transition-all"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h4 className="text-sm font-medium text-zinc-100 leading-snug">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Controles rápidos de movimentação */}
                      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-zinc-800/80 pt-2.5">
                        {col.id !== 'todo' && (
                          <button
                            onClick={() =>
                              handleMoveStatus(
                                task.id,
                                col.id === 'done' ? 'in_progress' : 'todo'
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
                          >
                            <ArrowLeft className="h-3 w-3" /> Voltar
                          </button>
                        )}
                        {col.id !== 'done' && (
                          <button
                            onClick={() =>
                              handleMoveStatus(
                                task.id,
                                col.id === 'todo' ? 'in_progress' : 'done'
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-400 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                          >
                            Avançar <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-800/80 text-xs text-zinc-600">
                    Nenhuma tarefa nesta coluna
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}