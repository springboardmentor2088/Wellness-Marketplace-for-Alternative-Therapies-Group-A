import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStoredUser } from '../services/authService';
import { getThreads, createThread, deleteThread, getMyThreads, searchThreads } from '../services/forumService';

export default function CommunityForum() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const user = getStoredUser();

  // Create Thread Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'General' });
  const [creating, setCreating] = useState(false);

  // My Questions & Search State
  const [showMyQuestions, setShowMyQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the forum.');
      navigate('/login');
      return;
    }
    if (!searchQuery.trim()) {
      fetchThreads();
    }
  }, [page, user?.id, navigate, showMyQuestions]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          const data = await searchThreads(searchQuery.trim(), 0, 10);
          setThreads(data.content);
          setTotalPages(data.totalPages);
        } catch (err) {
          toast.error('Search failed.');
        } finally {
          setLoading(false);
        }
      }, 300);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      let data;
      if (showMyQuestions) {
        data = await getMyThreads(page, 10);
      } else {
        data = await getThreads(page, 10);
      }
      setThreads(data.content);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error('Failed to load forum threads.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThread.title.trim() || !newThread.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    try {
      setCreating(true);
      await createThread(newThread);
      toast.success("Thread created successfully!");
      setShowCreateModal(false);
      setNewThread({ title: '', content: '', category: 'General' });
      fetchThreads(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create thread.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent navigating to thread
    if (!window.confirm("Are you sure you want to delete this thread?")) return;
    try {
      await deleteThread(id);
      toast.success("Thread deleted.");
      fetchThreads();
    } catch (err) {
      toast.error("Failed to delete thread.");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'PATIENT': return 'bg-blue-100 text-blue-800';
      case 'PRACTITIONER': return 'bg-teal-100 text-teal-800';
      case 'ADMIN': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && page === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <button 
            onClick={() => navigate(user?.role === 'PRACTITIONER' ? '/practitioner/dashboard' : '/user/dashboard')}
            className="text-teal-600 hover:text-teal-800 font-semibold mb-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Community Forum</h1>
          <p className="text-sm text-gray-500">Structured Q&A for the Wellness Community</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setShowMyQuestions(prev => !prev); setSearchQuery(''); setPage(0); }}
            className={`px-4 py-2 rounded-lg font-bold shadow transition ${showMyQuestions ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            {showMyQuestions ? '📋 My Questions' : '📋 My Questions'}
          </button>
          {(user?.role === 'PATIENT' || user?.role === 'PRACTITIONER') && (
            <button onClick={() => setShowCreateModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold shadow transition">
              + Ask a Question
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search questions by topic..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); setShowMyQuestions(false); }}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
          </div>
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {['Session', 'Medicine', 'Booking', 'Refund', 'Contact'].map(topic => (
              <button
                key={topic}
                onClick={() => { setSearchQuery(topic); setPage(0); setShowMyQuestions(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                  searchQuery.toLowerCase() === topic.toLowerCase()
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-700'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Section Label */}
        {showMyQuestions && !searchQuery && (
          <div className="mb-4 text-sm font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 inline-block">
            📋 Showing your latest questions
          </div>
        )}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-bold text-gray-600">Results for "{searchQuery}"</span>
            <button onClick={() => setSearchQuery('')} className="text-xs text-red-500 hover:underline font-bold">Clear</button>
          </div>
        )}

        {/* Thread List */}
        <div className="space-y-4">
          {threads.filter(t => !t.isDeleted).length === 0 ? (
            <div className="text-center bg-white rounded-xl p-10 shadow-sm border border-gray-100">
              <span className="text-4xl mb-4 block">📝</span>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No threads found</h3>
              <p className="text-gray-500">Be the first to ask a question in the community!</p>
            </div>
          ) : (
            threads.filter(t => !t.isDeleted).map(thread => (
              <div 
                key={thread.id} 
                onClick={() => navigate(`/community-forum/${thread.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md mb-3 uppercase tracking-wider">
                      {thread.category}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 hover:text-teal-600 transition">
                      {thread.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {thread.content}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-700">{thread.authorName}</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase ${getRoleBadgeColor(thread.authorRole)} text-[9px]`}>
                          {thread.authorRole}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                      <span className="font-bold text-gray-800 text-xs">·</span>
                     <span className="text-teal-600 font-bold">{thread.answersCount || 0} Answers</span>
                  </div>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <button 
                      onClick={(e) => handleDelete(e, thread.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                      title="Delete Thread"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 bg-white border rounded shadow-sm disabled:opacity-50 font-bold text-gray-700 hover:bg-gray-50">Previous</button>
            <span className="px-4 py-2 text-gray-600 font-medium">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-4 py-2 bg-white border rounded shadow-sm disabled:opacity-50 font-bold text-gray-700 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ask a Question</h2>
            <form onSubmit={handleCreateThread}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                  <input type="text" value={newThread.title} onChange={e => setNewThread({...newThread, title: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3" placeholder="What is your question about?" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select value={newThread.category} onChange={e => setNewThread({...newThread, category: e.target.value})} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 bg-white">
                    <option value="General">General</option>
                    <option value="Therapy">Therapy</option>
                    <option value="Medication">Medication</option>
                    <option value="Diet & Nutrition">Diet & Nutrition</option>
                    <option value="Mental Health">Mental Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Details</label>
                  <textarea value={newThread.content} onChange={e => setNewThread({...newThread, content: e.target.value})} rows={5} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3" placeholder="Provide more details about your inquiry..." required></textarea>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={creating} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-bold shadow transition disabled:opacity-50">
                  {creating ? 'Posting...' : 'Post Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
