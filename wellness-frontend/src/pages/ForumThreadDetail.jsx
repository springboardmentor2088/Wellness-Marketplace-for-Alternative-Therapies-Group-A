import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStoredUser } from '../services/authService';
import { 
  getThreadById, 
  addAnswer, 
  addComment, 
  deleteThread, 
  deleteAnswer, 
  deleteComment,
  likeAnswer,
  unlikeAnswer,
  acceptSolution,
  reportAnswer
} from '../services/forumService';

export default function ForumThreadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  // Answer & Comment state
  const [newAnswer, setNewAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [commentingOn, setCommentingOn] = useState(null); // answerId
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  // Dislike Modal State
  const [dislikeModalId, setDislikeModalId] = useState(null);
  const [dislikeReason, setDislikeReason] = useState('');
  const [otherDislikeReason, setOtherDislikeReason] = useState('');

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the forum.');
      navigate('/login');
      return;
    }
    fetchThread();
  }, [id, user?.id, navigate]);

  const fetchThread = async () => {
    try {
      setLoading(true);
      const data = await getThreadById(id);
      setThread(data);
    } catch (err) {
      toast.error('Failed to load thread details.');
      navigate('/community-forum');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;
    try {
      setSubmittingAnswer(true);
      await addAnswer(id, { content: newAnswer });
      toast.success("Answer posted!");
      setNewAnswer('');
      fetchThread();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to post answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAddComment = async (answerId) => {
    if (!newComment.trim()) return;
    try {
      setSubmittingComment(true);
      await addComment(answerId, { content: newComment });
      toast.success("Comment posted!");
      setCommentingOn(null);
      setNewComment('');
      fetchThread();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLike = async (answerId, currentStatus) => {
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic UI update
    setThread(prev => ({
      ...prev,
      answers: prev.answers.map(a =>
        a.id === answerId
          ? { ...a, userHasLiked: !currentStatus, likesCount: a.likesCount + (currentStatus ? -1 : 1) }
          : a
      )
    }));

    try {
      if (currentStatus) {
        await unlikeAnswer(answerId);
      } else {
        await likeAnswer(answerId);
      }
      // Re-fetch or rely on optimistic update.
      // For hardening, we'll do a silent sync in background next time it's needed
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update like');
      // Rollback optimistic update
      setThread(prev => ({
        ...prev,
        answers: prev.answers.map(a =>
          a.id === answerId
            ? { ...a, userHasLiked: currentStatus, likesCount: a.likesCount + (currentStatus ? 1 : -1) }
            : a
        )
      }));
    } finally {
      setTimeout(() => setIsLiking(false), 500); // 500ms debounce
    }
  };

  const submitDislike = async () => {
    if (!dislikeReason) {
      toast.error('Please select a reason for disliking.');
      return;
    }
    const finalReason = dislikeReason === 'Other' ? otherDislikeReason : dislikeReason;
    if (dislikeReason === 'Other' && !finalReason.trim()) {
      toast.error('Please specify the other reason.');
      return;
    }
    
    try {
      await reportAnswer(dislikeModalId, finalReason);
      toast.success('Report submitted! Admin will review it.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'You have already reported this answer.');
    }
    
    setDislikeModalId(null);
    setDislikeReason('');
    setOtherDislikeReason('');
  };

  const handleAccept = async (answerId) => {
    if (processingAction) return;
    if (!window.confirm("Mark this answer as the best solution? This will pin it to the top.")) return;
    try {
      setProcessingAction(true);
      await acceptSolution(answerId);
      toast.success("Solution accepted!");
      fetchThread();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDelete = async (type, itemId) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      if (type === 'thread') {
        await deleteThread(itemId);
        toast.success("Thread deleted.");
        navigate('/community-forum');
      } else if (type === 'answer') {
        await deleteAnswer(itemId);
        toast.success("Answer deleted.");
        fetchThread();
      } else if (type === 'comment') {
        await deleteComment(itemId);
        toast.success("Comment deleted.");
        fetchThread();
      }
    } catch (err) {
      toast.error(`Failed to delete ${type}.`);
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

  if (loading || !thread) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-teal-600"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isPractitioner = user?.role === 'PRACTITIONER';
  const isThreadOwner = thread.authorId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow px-6 py-4 sticky top-0 z-10">
        <button 
          onClick={() => navigate('/community-forum')}
          className="text-teal-600 hover:text-teal-800 font-semibold mb-2 flex items-center gap-1 transition"
        >
          ← Back to Forum
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Main Thread Question */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
          {(isAdmin || isThreadOwner) && (
             <button onClick={() => handleDelete('thread', thread.id)} className="absolute top-6 right-6 text-red-500 hover:bg-red-50 p-2 rounded-lg" title="Delete Thread">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          )}
          <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md mb-4 uppercase tracking-wider">
            {thread.category}
          </span>
          <h1 className="text-3xl font-black text-gray-900 mb-4 pr-10">{thread.title}</h1>
          <p className="text-gray-700 whitespace-pre-wrap text-lg mb-6 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
            {thread.content}
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 inline-flex px-4 py-2 rounded-full">
             <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700">
               {thread.authorName.charAt(0)}
             </div>
             <div>
                <span className="font-bold text-gray-800 block text-xs">{thread.authorName}</span>
                <span className="text-[10px]">{new Date(thread.createdAt).toLocaleString()}</span>
             </div>
             <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${getRoleBadgeColor(thread.authorRole)} text-[10px] ml-2`}>
               {thread.authorRole}
             </span>
          </div>
        </div>

        {/* Answers Section Header */}
        <div className="pt-4 border-b border-gray-200 pb-2">
            <h2 className="text-xl font-bold text-gray-800">{thread.answers?.length || 0} Answers</h2>
            <p className="text-sm text-gray-500 mt-1">Sorted by reputation and helpfulness</p>
        </div>

        {/* Answers List */}
        <div className="space-y-6">
          {thread.answers?.map(answer => (
            <div key={answer.id} className={`bg-white rounded-xl shadow-sm border ${answer.isAccepted ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-gray-100'} overflow-hidden relative`}>
              {answer.isAccepted && (
                <div className="bg-teal-500 text-white text-[10px] font-black uppercase px-3 py-1 absolute top-0 left-0 rounded-br-lg shadow-sm">
                   Best Answer
                </div>
              )}
              {/* Answer Content */}
              <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white shadow-md relative">
                         {answer.authorName.charAt(0)}
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-gray-900">{answer.authorName}</span>
                             {answer.authorRole === 'PRACTITIONER' && (
                               <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-[10px] font-bold font-mono">Expert</span>
                             )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-gray-400">{new Date(answer.createdAt).toLocaleString()}</span>
                            <span className="text-teal-600 font-bold bg-teal-50 px-1.5 rounded">{answer.authorReputation} pts</span>
                          </div>
                       </div>
                    </div>

                    {/* Like & Accept Logic */}
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => handleLike(answer.id, answer.userHasLiked)}
                         disabled={processingAction || answer.authorId === user?.id}
                         className={`flex flex-col items-center transition group ${answer.userHasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400 disabled:opacity-30'}`}
                         title={answer.authorId === user?.id ? "You cannot like your own answer" : "Helpful Answer"}
                       >
                         <svg className={`w-6 h-6 ${answer.userHasLiked ? 'fill-current' : 'fill-none'} stroke-current`} strokeWidth={2} viewBox="0 0 24 24">
                           <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                         </svg>
                         <span className="text-xs font-bold">{answer.likesCount}</span>
                       </button>

                       <button 
                         onClick={() => setDislikeModalId(answer.id)}
                         disabled={processingAction || answer.authorId === user?.id}
                         className="flex flex-col items-center transition group text-gray-400 hover:text-gray-600 disabled:opacity-30"
                         title={answer.authorId === user?.id ? "You cannot dislike your own answer" : "Dislike Answer"}
                       >
                         {/* Heartbroken Icon */}
                         <svg className="w-6 h-6 fill-none stroke-current" strokeWidth={2} viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M11 21.036A2.25 2.25 0 0013.5 19H17a3 3 0 003-3V6a3 3 0 00-3-3H7a3 3 0 00-3 3v10a3 3 0 003 3h1.5l2.5 2.036z" className="hidden" /> {/* Dummy path to keep size normal */}
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                           {/* A jagged line splitting the heart */}
                           <path strokeLinecap="round" strokeLinejoin="round" d="M13 3l-3 7 4 3-5 8" className="stroke-white" strokeWidth={3} />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M13 3l-3 7 4 3-5 8" />
                         </svg>
                         <span className="text-xs font-bold">0</span>
                       </button>

                       <div className="flex flex-col items-center gap-2">
                         {(isAdmin || isThreadOwner) && !answer.isAccepted && (
                           <button 
                             onClick={() => handleAccept(answer.id)}
                             disabled={processingAction}
                             className="text-teal-600 hover:bg-teal-50 p-2 rounded-full transition"
                             title="Mark as Best Answer"
                           >
                             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           </button>
                         )}
                         {isAdmin && (
                           <button 
                             onClick={() => handleDelete('answer', answer.id)}
                             className="text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                             title="Delete Answer"
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                         )}
                       </div>
                    </div>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {answer.content}
                  </p>
                  {answer.isAccepted && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-teal-700 font-bold bg-teal-50 px-3 py-2 rounded-lg border border-teal-100">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Accepted as solution by {answer.acceptedBy === user?.name ? 'you' : answer.acceptedBy} {answer.acceptedAt && `on ${new Date(answer.acceptedAt).toLocaleDateString()}`}
                    </div>
                  )}
              </div>

              {/* Comments Section within Answer */}
              <div className="bg-gray-50 border-t border-gray-100 p-4 lg:pl-16">
                 {answer.comments?.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {answer.comments.map(comment => (
                        <div key={comment.id} className="relative group p-3 bg-white rounded-lg border border-gray-200">
                          {isAdmin && (
                            <button onClick={() => handleDelete('comment', comment.id)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition" title="Delete Comment">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-bold text-gray-800 text-xs">{comment.authorName}</span>
                            <span className={`px-1.5 py-px rounded-sm font-bold uppercase ${getRoleBadgeColor(comment.authorRole)} text-[9px]`}>
                              {comment.authorRole}
                            </span>
                            <span className="text-gray-400 text-[10px]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                 )}
                 
                 {/* Add Comment Input */}
                 <div className="mt-2 text-right lg:text-left">
                    {commentingOn === answer.id ? (
                      <div className="flex gap-2 w-full max-w-lg">
                         <input 
                           type="text" 
                           value={newComment} 
                           onChange={e => setNewComment(e.target.value)} 
                           className="flex-1 border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 text-sm p-2 bg-white border" 
                           placeholder="Write a comment..."
                           autoFocus
                         />
                         <button onClick={() => handleAddComment(answer.id)} disabled={submittingComment || !newComment.trim()} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-bold text-sm transition disabled:opacity-50">Post</button>
                         <button onClick={() => {setCommentingOn(null); setNewComment('');}} className="text-gray-500 font-bold text-sm px-2">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setCommentingOn(answer.id)} className="text-teal-600 font-bold text-sm hover:underline">
                        Reply to this answer
                      </button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form to submit an answer (Practitioners or Admin only) */}
        {(isAdmin || isPractitioner) && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-teal-100 mt-8 mb-20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4">
                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">Practitioner View</span>
             </div>
             <form onSubmit={handleAddAnswer}>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Submit an Expert Answer</h3>
                <textarea 
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  className="w-full border-gray-300 rounded-xl focus:ring-teal-500 focus:border-teal-500 p-4 shadow-inner min-h-[120px]"
                  placeholder="Share your medical/wellness expertise to assist with this question..."
                  required
                />
                <div className="flex justify-end mt-4">
                   <button 
                     type="submit" 
                     disabled={submittingAnswer || !newAnswer.trim()} 
                     className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow transition disabled:opacity-50"
                   >
                     {submittingAnswer ? 'Publishing...' : 'Publish Answer'}
                   </button>
                </div>
             </form>
          </div>
        )}
      </div>

      {/* Dislike Reason Modal */}
      {dislikeModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-fade-in">
            <button 
              onClick={() => { setDislikeModalId(null); setDislikeReason(''); setOtherDislikeReason(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Why are you disliking this?</h3>
            <p className="text-sm text-gray-500 mb-6">Your feedback helps keep the community safe and helpful.</p>
            
            <div className="space-y-3 mb-6">
              {['Inaccurate', 'Dangerous', 'Spam', 'Other'].map(reason => (
                <label key={reason} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input 
                    type="radio" 
                    name="dislikeReason" 
                    value={reason}
                    checked={dislikeReason === reason}
                    onChange={(e) => setDislikeReason(e.target.value)}
                    className="w-4 h-4 text-red-500 focus:ring-red-500"
                  />
                  <span className="font-medium text-gray-800">{reason}</span>
                </label>
              ))}
            </div>

            {dislikeReason === 'Other' && (
              <textarea 
                value={otherDislikeReason}
                onChange={(e) => setOtherDislikeReason(e.target.value)}
                placeholder="Please specify why..."
                className="w-full border border-gray-200 rounded-xl p-3 mb-6 focus:ring-red-500 focus:border-red-500 outline-none resize-none shadow-inner"
                rows="3"
                autoFocus
              />
            )}

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => { setDislikeModalId(null); setDislikeReason(''); setOtherDislikeReason(''); }}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={submitDislike}
                className="px-5 py-2.5 bg-red-500 text-white font-bold hover:bg-red-600 rounded-xl transition shadow-sm"
              >
                Submit Dislike
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

