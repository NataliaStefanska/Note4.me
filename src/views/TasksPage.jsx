import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import TasksView from "../components/TasksView";

export default function TasksPage() {
  const {
    t, notes, space, allTags, standaloneTasks, activeSpace,
    openNote, createTask, toggleTaskInList, toggleStandaloneTask,
  } = useApp();
  const navigate = useNavigate();

  function handleOpenNote(note) {
    openNote(note);
    navigate("/editor");
  }

  return (
    <TasksView
      notes={notes.filter(n=>!n.archived)}
      color={space.color}
      allTags={allTags}
      onOpenNote={handleOpenNote}
      onCreate={createTask}
      onToggleTask={toggleTaskInList}
      standaloneTasks={standaloneTasks[activeSpace]||[]}
      onToggleStandaloneTask={toggleStandaloneTask}
      t={t}
    />
  );
}
