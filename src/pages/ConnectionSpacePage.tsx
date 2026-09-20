import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageCircle, Send, Image, HelpCircle, Gamepad2, Camera, Heart, X, Lock, Trophy, Mic, Square, Flag, Ban, Shield, Sparkles, Crown, MoreHorizontal, Pencil, Trash2, Copy, CheckCheck, HeartHandshake, Gift, Music, Smile, Reply, SmilePlus } from 'lucide-react';
import { playNotificationSound } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SurpriseMessages from '@/components/connection/SurpriseMessages';
import MicPermissionModal from '@/components/connection/MicPermissionModal';
import SharedSongs from '@/components/connection/SharedSongs';
import EmojiStickerPicker from '@/components/chat/EmojiStickerPicker';

const romanticGames = [
  { id: 'truth', name: 'Truth or Dare 💕', desc: 'Romantic truth & dare prompts', prompts: ['What made you first notice me?', 'Dare: Send a voice note saying 3 things you love about me', "What is your favorite memory of us?", 'Dare: Plan our next date right now', 'What do you find most attractive about me?'] },
  { id: 'thisorthat', name: 'This or That 🤔', desc: 'Quick choice cards', prompts: ['Coffee dates ☕ or Dinner dates 🍽️?', 'Sunrise walks 🌅 or Midnight drives 🌙?', 'Love letters 💌 or Surprise gifts 🎁?', 'Beach vacation 🏖️ or Mountain retreat ⛰️?', 'Movie night 🎬 or Game night 🎮?'] },
  { id: 'knowme', name: 'Who Knows Me Better 🧠', desc: 'Answer questions about each other', prompts: ["What is my biggest fear?", "What's my favorite food?", "What makes me laugh the most?", "What's my dream vacation?", "What's my hidden talent?"] },
  { id: 'dreamdate', name: 'Dream Date Planner 🗓️', desc: 'Plan your perfect date together', prompts: ['Where should our dream date be?', 'What is the perfect dress code?', 'What food should we have?', 'What music should set the mood?', 'What surprise element?'] },
];

const friendlyGames = [
  { id: 'friendthisthat', name: 'This or That (Friend Edition) 🤔', desc: 'Fun quick choices with friends', prompts: ['Pizza 🍕 or Tacos 🌮?', 'Morning person 🌅 or Night owl 🦉?', 'Netflix binge 📺 or Outdoor adventure 🏕️?', 'Books 📚 or Podcasts 🎧?', 'Cats 🐱 or Dogs 🐶?'] },
  { id: 'bestfriendquiz', name: 'Best Friend Quiz 🧠', desc: 'How well do you know each other?', prompts: ["What's my favorite color?", "What's my biggest pet peeve?", "What would I do with a million dollars?", "What's my comfort food?", "What's my biggest dream?"] },
  { id: 'wyr', name: 'Would You Rather (Safe) 🤷', desc: 'Fun safe dilemmas', prompts: ['Would you rather travel the world or have unlimited money?', 'Would you rather fly or be invisible?', 'Would you rather always be early or always be on time?', 'Would you rather have super strength or super speed?', 'Would you rather live in the city or countryside?'] },
  { id: 'twotruths', name: 'Two Truths and a Lie 🤥', desc: 'Can you spot the lie?', prompts: ['Share your first Two Truths and a Lie!', 'Round 2: Make it harder!', 'Round 3: Most surprising facts!', 'Round 4: Childhood edition!', 'Round 5: Final round - wildest stories!'] },
];

const romanticMilestoneLabels = [
  { days: 1, label: '1 Day Together 🌱', emoji: '🌱' },
  { days: 7, label: '1 Week Together 🌸', emoji: '🌸' },
  { days: 30, label: '1 Month Together 🌹', emoji: '🌹' },
  { days: 90, label: '3 Months Together 💐', emoji: '💐' },
  { days: 180, label: '6 Months Together 🌻', emoji: '🌻' },
  { days: 365, label: '1 Year Together 💎', emoji: '💎' },
];

const friendshipMilestoneLabels = [
  { days: 7, label: '1 Week of Friendship 🤝', emoji: '🤝' },
  { days: 30, label: '1 Month Friends 🌟', emoji: '🌟' },
  { days: 180, label: '6 Months Friends 🎯', emoji: '🎯' },
  { days: 365, label: '1 Year Best Friends 🏆', emoji: '🏆' },
];

const SAFETY_KEYWORDS = ['let\'s meet', 'send location', 'come over', 'hotel', 'pick you up', 'my place', 'your place', 'address'];
const matchmakingQuestions = ['What do you like most about this person?', 'What are you looking for?', 'What are your deal breakers?', 'What is your love language?', 'Describe your ideal lifestyle together.'];
const marriageQuestions = ['Why do you want to marry this person?', 'How do you see your future together?', 'How will you handle disagreements?', 'What are your financial goals?', 'What does a happy marriage look like?'];

const ConnectionSpacePage = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connection, setConnection] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [memories, setMemories] = useState<any[]>([]);
  const [dailyQuestion, setDailyQuestion] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [uploadingMemory, setUploadingMemory] = useState(false);
  const [memoryCaption, setMemoryCaption] = useState('');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gamePromptIdx, setGamePromptIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [micErrorType, setMicErrorType] = useState<'denied' | 'not-found' | 'unknown'>('denied');

  // Message actions
  const [msgMenu, setMsgMenu] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState('');
  const [replyToMsg, setReplyToMsg] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [msgReactions, setMsgReactions] = useState<Record<string, any[]>>({});
  const [myDeletions, setMyDeletions] = useState<Set<string>>(new Set());
  const [showMsgReactions, setShowMsgReactions] = useState<string | null>(null);

  // Games with answer persistence
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [gameAnswers, setGameAnswers] = useState<Record<number, string>>({});
  const [gameCurrentAnswer, setGameCurrentAnswer] = useState('');
  const [partnerGameAnswers, setPartnerGameAnswers] = useState<Record<number, string>>({});
  const [gameCompleted, setGameCompleted] = useState(false);

  // Matchmaking
  const [mmAnswers, setMmAnswers] = useState<string[]>(Array(5).fill(''));
  const [mmDecision, setMmDecision] = useState<string | null>(null);
  const [mmPartnerData, setMmPartnerData] = useState<any>(null);
  const [mmMyData, setMmMyData] = useState<any>(null);
  const [mmSubmitting, setMmSubmitting] = useState(false);

  // Marriage
  const [marAnswers, setMarAnswers] = useState<string[]>(Array(5).fill(''));
  const [marDecision, setMarDecision] = useState<string | null>(null);
  const [marPartnerData, setMarPartnerData] = useState<any>(null);
  const [marMyData, setMarMyData] = useState<any>(null);
  const [marSubmitting, setMarSubmitting] = useState(false);

  // Dating request
  const [datingRequest, setDatingRequest] = useState<any>(null);
  const [showDatingPrompt, setShowDatingPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldForceScrollRef = useRef(true);
  const [showNewMsgIndicator, setShowNewMsgIndicator] = useState(false);
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Derived: connection type
  const isRomantic = connection?.relationship_track === 'romantic';
  const isFriendship = connection?.relationship_track === 'friendship';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    setShowNewMsgIndicator(false);
  }, []);

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 150;
  }, []);

  const loadConnection = useCallback(async () => {
    if (!connectionId || !user) return;
    const { data: conn } = await supabase.from('connections').select('*').eq('id', connectionId).single();
    if (!conn) { navigate('/chats'); return; }
    setConnection(conn);
    const otherId = conn.user1_id === user.id ? conn.user2_id : conn.user1_id;
    const { data: otherProfile } = await supabase.from('profiles').select('*').eq('user_id', otherId).single();
    setOtherUser(otherProfile);

    const { data: msgs } = await supabase.from('connection_messages').select('*').eq('connection_id', connectionId).order('created_at', { ascending: false }).limit(50);
    setMessages((msgs || []).reverse());
    shouldForceScrollRef.current = true;

    const { data: mems } = await supabase.from('memories').select('*').eq('connection_id', connectionId).order('created_at', { ascending: false });
    setMemories(mems || []);

    const { data: questions } = await supabase.from('daily_questions').select('*').limit(10);
    if (questions?.length) {
      const today = new Date().toISOString().slice(0, 10);
      const idx = today.split('-').reduce((a, b) => a + parseInt(b), 0) % questions.length;
      const q = questions[idx];
      setDailyQuestion(q);
      const { data: answers } = await supabase.from('daily_question_answers').select('*').eq('question_id', q.id).eq('connection_id', connectionId);
      const mine = answers?.find(a => a.user_id === user.id);
      const theirs = answers?.find(a => a.user_id !== user.id);
      if (mine) { setHasAnswered(true); setMyAnswer(mine.answer); }
      if (theirs) setPartnerAnswer(theirs.answer);
    }

    const { data: mmData } = await supabase.from('matchmaking_sessions').select('*').eq('connection_id', connectionId);
    const myMM = (mmData || []).find((d: any) => d.user_id === user.id);
    const partnerMM = (mmData || []).find((d: any) => d.user_id !== user.id);
    if (myMM) { setMmMyData(myMM); setMmAnswers(Object.values(myMM.answers || {})); setMmDecision(myMM.decision); }
    if (partnerMM) setMmPartnerData(partnerMM);

    const { data: marData } = await supabase.from('marriage_sessions').select('*').eq('connection_id', connectionId);
    const myMar = (marData || []).find((d: any) => d.user_id === user.id);
    const partnerMar = (marData || []).find((d: any) => d.user_id !== user.id);
    if (myMar) { setMarMyData(myMar); setMarAnswers(Object.values(myMar.answers || {})); setMarDecision(myMar.decision); }
    if (partnerMar) setMarPartnerData(partnerMar);

    // Check dating request
    const { data: dr } = await supabase.from('dating_requests').select('*').eq('connection_id', connectionId).eq('status', 'pending').maybeSingle();
    setDatingRequest(dr);
  }, [connectionId, user, navigate]);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  useLayoutEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];

    if (shouldForceScrollRef.current || isNearBottom() || lastMsg?.sender_id === user?.id) {
      requestAnimationFrame(() => scrollToBottom(shouldForceScrollRef.current ? 'auto' : 'smooth'));
      shouldForceScrollRef.current = false;
      return;
    }

    if (lastMsg?.sender_id !== user?.id) {
      setShowNewMsgIndicator(true);
    }
  }, [messages, user?.id, isNearBottom, scrollToBottom]);

  // Mark messages as read
  const markMessagesRead = useCallback(async () => {
    if (!connectionId || !user) return;
    const unread = messages.filter(m => m.sender_id !== user.id && !m.is_read);
    if (unread.length > 0) {
      await supabase.from('connection_messages').update({ is_read: true } as any).in('id', unread.map(m => m.id));
    }
  }, [connectionId, user, messages]);

  useEffect(() => { markMessagesRead(); }, [messages, markMessagesRead]);

  // Realtime
  useEffect(() => {
    if (!connectionId) return;
    const channel = supabase.channel(`space-${connectionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_messages', filter: `connection_id=eq.${connectionId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const tempIndex = prev.findIndex(m =>
                String(m.id).startsWith('temp-') &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content &&
                m.reply_to_message_id === newMsg.reply_to_message_id &&
                m.message_type === newMsg.message_type
              );
              if (tempIndex >= 0) {
                const next = [...prev];
                next[tempIndex] = newMsg;
                return next;
              }
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== user?.id) {
              playNotificationSound('message');
              supabase.from('connection_messages').update({ is_read: true } as any).eq('id', newMsg.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          const reaction = (payload.new || payload.old) as any;
          if (!reaction || !messages.some(message => message.id === reaction.message_id)) return;

          setMsgReactions(prev => {
            const existing = prev[reaction.message_id] || [];

            if (payload.eventType === 'INSERT') {
              return { ...prev, [reaction.message_id]: [...existing.filter(item => item.id !== reaction.id), reaction] };
            }

            if (payload.eventType === 'UPDATE') {
              return { ...prev, [reaction.message_id]: existing.map(item => item.id === reaction.id ? reaction : item) };
            }

            return { ...prev, [reaction.message_id]: existing.filter(item => item.id !== reaction.id) };
          });
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_deletions' },
        (payload) => {
          const deletion = (payload.new || payload.old) as any;
          if (!deletion || deletion.user_id !== user?.id || !messages.some(message => message.id === deletion.message_id)) return;

          setMyDeletions(prev => {
            const next = new Set(prev);
            if (payload.eventType === 'DELETE') next.delete(deletion.message_id);
            else next.add(deletion.message_id);
            return next;
          });
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories', filter: `connection_id=eq.${connectionId}` },
        (payload) => {
          setMemories(prev => {
            if (prev.some(m => m.id === (payload.new as any).id)) return prev;
            return [payload.new as any, ...prev];
          });
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_question_answers', filter: `connection_id=eq.${connectionId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && (payload.new as any).user_id !== user?.id) {
            setPartnerAnswer((payload.new as any).answer);
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `id=eq.${connectionId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') setConnection(payload.new);
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dating_requests', filter: `connection_id=eq.${connectionId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const dr = payload.new as any;
            setDatingRequest(dr.status === 'pending' ? dr : null);
            if (dr.status === 'pending' && dr.requester_id !== user?.id) {
              setShowDatingPrompt(true);
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [connectionId, user]);

  const checkSafety = (text: string) => {
    if (safetyAccepted) return true;
    if (SAFETY_KEYWORDS.some(k => text.toLowerCase().includes(k))) { setShowSafetyModal(true); return false; }
    return true;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !connectionId) return;
    if (!checkSafety(newMessage)) return;
    const replyTarget = replyToMsg;
    const replyId = replyTarget?.id || null;
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId, connection_id: connectionId, sender_id: user!.id, content: newMessage.trim(),
      message_type: 'text', created_at: new Date().toISOString(), is_read: false, is_deleted: false,
      is_deleted_for_everyone: false, reply_to_message_id: replyId, edited_at: null,
    };
    shouldForceScrollRef.current = true;
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setReplyToMsg(null);
    const { data, error } = await supabase.from('connection_messages').insert({
      connection_id: connectionId, sender_id: user!.id, content: optimisticMsg.content,
      reply_to_message_id: replyId,
    } as any).select().single();
    if (error) {
      setMessages(prev => prev.filter(message => message.id !== tempId));
      setNewMessage(optimisticMsg.content);
      setReplyToMsg(replyTarget || null);
      toast.error(error.message || 'Failed to send message');
      return;
    }
    if (data) {
      setMessages(prev => {
        const withoutTemp = prev.filter(message => message.id !== tempId && message.id !== data.id);
        return [...withoutTemp, data];
      });
    }
  };

  const editMessage = async (msgId: string) => {
    if (!editMsgText.trim()) return;
    await supabase.from('connection_messages').update({ content: editMsgText.trim(), edited_at: new Date().toISOString() } as any).eq('id', msgId);
    setEditingMsg(null); setMsgMenu(null);
    toast.success('Message edited');
  };

  const deleteForMe = async (msgId: string) => {
    setMyDeletions(prev => new Set(prev).add(msgId));
    const { error } = await supabase.from('message_deletions').insert({ message_id: msgId, user_id: user!.id });
    if (error) {
      setMyDeletions(prev => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
      toast.error(error.message || 'Unable to delete message');
      return;
    }
    setMsgMenu(null);
    toast.success('Deleted for you');
  };

  const deleteForEveryone = async (msgId: string) => {
    setMessages(prev => prev.map(message => message.id === msgId ? {
      ...message,
      is_deleted_for_everyone: true,
      content: 'This message was deleted',
      deleted_for_everyone_at: new Date().toISOString(),
    } : message));

    const { error } = await supabase.from('connection_messages').update({
      is_deleted_for_everyone: true, content: 'This message was deleted',
      deleted_for_everyone_at: new Date().toISOString(),
    } as any).eq('id', msgId);
    if (error) {
      toast.error(error.message || 'Unable to delete for everyone');
      loadConnection();
      return;
    }
    setMsgMenu(null);
    toast.success('Deleted for everyone');
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const existing = msgReactions[msgId]?.find(r => r.user_id === user!.id);
    if (existing) {
      if (existing.reaction === emoji) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').update({ reaction: emoji } as any).eq('id', existing.id);
      }
    } else {
      await supabase.from('message_reactions').insert({ message_id: msgId, user_id: user!.id, reaction: emoji });
    }
    setShowMsgReactions(null);
    // Reload reactions
    loadReactions();
  };

  const loadReactions = useCallback(async () => {
    if (!connectionId) return;
    const msgIds = messages.map(m => m.id).filter(id => !id.startsWith('temp-'));
    if (!msgIds.length) return;
    const { data } = await supabase.from('message_reactions').select('*').in('message_id', msgIds);
    const grouped: Record<string, any[]> = {};
    (data || []).forEach(r => { if (!grouped[r.message_id]) grouped[r.message_id] = []; grouped[r.message_id].push(r); });
    setMsgReactions(grouped);
  }, [connectionId, messages]);

  useEffect(() => { loadReactions(); }, [loadReactions]);

  // Load my deletions
  useEffect(() => {
    if (!user || !connectionId) return;
    const loadDeletions = async () => {
      const { data } = await supabase.from('message_deletions').select('message_id').eq('user_id', user.id);
      setMyDeletions(new Set((data || []).map(d => d.message_id)));
    };
    loadDeletions();
  }, [user, connectionId]);

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied!');
    setMsgMenu(null);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Voice recording requires HTTPS');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const path = `${user!.id}/${connectionId}/${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage.from('voice-messages').upload(path, blob);
        if (upErr) { toast.error('Voice upload failed'); return; }
        const { data: { publicUrl } } = supabase.storage.from('voice-messages').getPublicUrl(path);
        await supabase.from('connection_messages').insert({ connection_id: connectionId!, sender_id: user!.id, content: publicUrl, message_type: 'voice' });
        toast.success('Voice message sent! 🎤');
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTimeout(() => { if (recorder.state === 'recording') { recorder.stop(); setIsRecording(false); } }, 60000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicErrorType('denied');
        setShowMicModal(true);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicErrorType('not-found');
        setShowMicModal(true);
      } else {
        setMicErrorType('unknown');
        setShowMicModal(true);
      }
    }
  };

  const retryMicPermission = () => {
    setShowMicModal(false);
    startRecording();
  };

  const stopRecording = () => { if (mediaRecorder?.state === 'recording') { mediaRecorder.stop(); setIsRecording(false); } };

  const submitDailyAnswer = async () => {
    if (!myAnswer.trim() || !dailyQuestion || !connectionId) return;
    await supabase.from('daily_question_answers').insert({ question_id: dailyQuestion.id, connection_id: connectionId, user_id: user!.id, answer: myAnswer.trim() });
    setHasAnswered(true);
    toast.success('Answer submitted! 💕');
  };

  const uploadMemory = async (file: File) => {
    if (!connectionId || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG, WEBP'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploadingMemory(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${connectionId}/${Date.now()}.${ext}`;
    await supabase.storage.from('memories').upload(path, file);
    const { data: { publicUrl } } = supabase.storage.from('memories').getPublicUrl(path);
    await supabase.from('memories').insert({ connection_id: connectionId, user_id: user.id, image_url: publicUrl, caption: memoryCaption.trim() });
    toast.success('Memory added! 📸');
    setMemoryCaption('');
    const { data: mems } = await supabase.from('memories').select('*').eq('connection_id', connectionId).order('created_at', { ascending: false });
    setMemories(mems || []);
    setUploadingMemory(false);
  };

  const blockUser = async () => {
    if (!otherUser || !connectionId) return;
    await supabase.from('blocked_users').insert({ blocker_id: user!.id, blocked_id: otherUser.user_id });
    toast.success('User blocked');
    navigate('/chats');
  };

  const reportUser = async () => {
    if (!otherUser) return;
    await supabase.from('reports').insert({ reporter_id: user!.id, reported_user_id: otherUser.user_id, reason: 'inappropriate_behavior', details: `Connection ${connectionId}` });
    toast.success('Report submitted 🛡️');
  };

  // Get correct games based on relationship track
  const currentGames = isRomantic ? romanticGames : friendlyGames;
  const allGames = [...romanticGames, ...friendlyGames];

  const startGame = async (gameType: string) => {
    if (!connectionId) return;
    const { data: session } = await supabase.from('game_sessions').insert({
      connection_id: connectionId, game_type: gameType, created_by: user!.id,
    } as any).select().single();
    if (session) {
      setGameSessionId(session.id);
      setActiveGame(gameType);
      setGamePromptIdx(0);
      setGameAnswers({});
      setGameCurrentAnswer('');
      setPartnerGameAnswers({});
      setGameCompleted(false);
    }
  };

  const submitGameAnswer = async () => {
    if (!gameCurrentAnswer.trim() || !gameSessionId) return;
    await supabase.from('game_answers').insert({
      session_id: gameSessionId, user_id: user!.id, question_index: gamePromptIdx, answer: gameCurrentAnswer.trim(),
    } as any);
    setGameAnswers(prev => ({ ...prev, [gamePromptIdx]: gameCurrentAnswer.trim() }));
    setGameCurrentAnswer('');

    const game = allGames.find(g => g.id === activeGame);
    if (game && gamePromptIdx < game.prompts.length - 1) {
      setGamePromptIdx(gamePromptIdx + 1);
    } else {
      await supabase.from('game_sessions').update({ status: 'completed' } as any).eq('id', gameSessionId);
      const { data: allAnswers } = await supabase.from('game_answers').select('*').eq('session_id', gameSessionId);
      const partnerAns: Record<number, string> = {};
      (allAnswers || []).filter((a: any) => a.user_id !== user!.id).forEach((a: any) => { partnerAns[a.question_index] = a.answer; });
      setPartnerGameAnswers(partnerAns);
      setGameCompleted(true);
      toast.success('Game completed! 🎉');
    }
  };

  const handleThisOrThatAnswer = async (choice: string) => {
    if (!gameSessionId) return;
    await supabase.from('game_answers').insert({
      session_id: gameSessionId, user_id: user!.id, question_index: gamePromptIdx, answer: choice,
    } as any);
    setGameAnswers(prev => ({ ...prev, [gamePromptIdx]: choice }));

    const game = allGames.find(g => g.id === activeGame);
    if (game && gamePromptIdx < game.prompts.length - 1) {
      setGamePromptIdx(gamePromptIdx + 1);
    } else {
      await supabase.from('game_sessions').update({ status: 'completed' } as any).eq('id', gameSessionId);
      const { data: allAnswers } = await supabase.from('game_answers').select('*').eq('session_id', gameSessionId);
      const partnerAns: Record<number, string> = {};
      (allAnswers || []).filter((a: any) => a.user_id !== user!.id).forEach((a: any) => { partnerAns[a.question_index] = a.answer; });
      setPartnerGameAnswers(partnerAns);
      setGameCompleted(true);
      toast.success('Game completed! 🎉');
    }
  };

  // Dating request - only for friendship connections upgrading
  const sendDatingRequest = async () => {
    if (!connectionId || !otherUser) return;
    if (['dating', 'married'].includes(otherUser.relationship_status)) {
      toast.info('This person is already in a relationship');
      return;
    }
    // Check cooldown for friendship connections
    if (isFriendship) {
      const { data: declined } = await supabase.from('dating_requests').select('updated_at').eq('connection_id', connectionId).eq('status', 'declined').order('updated_at', { ascending: false }).limit(1);
      if (declined?.length) {
        const daysSince = (Date.now() - new Date(declined[0].updated_at).getTime()) / 86400000;
        if (daysSince < 7) {
          toast.error(`Please wait ${Math.ceil(7 - daysSince)} more days before requesting again`);
          return;
        }
      }
    }
    await supabase.from('dating_requests').insert({
      connection_id: connectionId, requester_id: user!.id,
    } as any);
    await supabase.from('notifications').insert({
      user_id: otherUser.user_id, type: 'dating_request',
      title: 'Start Dating? 💜',
      message: `${(await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single()).data?.full_name} wants to start dating you!`,
      data: { connection_id: connectionId },
    });
    toast.success('Dating request sent! 💜');
  };

  const respondDatingRequest = async (accept: boolean) => {
    if (!datingRequest || !connectionId) return;
    if (accept) {
      await supabase.from('dating_requests').update({ status: 'accepted' } as any).eq('id', datingRequest.id);
      // For friendship connections: unlock matchmaking immediately
      if (isFriendship) {
        await supabase.from('connections').update({ 
          matchmaking_unlocked_at: new Date().toISOString() 
        } as any).eq('id', connectionId);
      }
      setDatingRequest(null);
      setShowDatingPrompt(false);
      toast.success('Accepted! Complete matchmaking to start dating 💜');
    } else {
      await supabase.from('dating_requests').update({ status: 'declined' } as any).eq('id', datingRequest.id);
      setDatingRequest(null);
      setShowDatingPrompt(false);
      toast.info('Dating request declined');
    }
  };

  // Matchmaking
  const submitMatchmaking = async (decision: 'match' | 'not_now') => {
    if (!connectionId) return;
    setMmSubmitting(true);
    const answersObj: Record<string, string> = {};
    mmAnswers.forEach((a, i) => { answersObj[`q${i}`] = a; });
    if (mmMyData) await supabase.from('matchmaking_sessions').update({ answers: answersObj, decision } as any).eq('id', mmMyData.id);
    else await supabase.from('matchmaking_sessions').insert({ connection_id: connectionId, user_id: user!.id, answers: answersObj, decision } as any);
    setMmDecision(decision);
    setMmMyData({ ...mmMyData, answers: answersObj, decision });
    if (mmPartnerData?.decision) {
      if (decision === 'match' && mmPartnerData.decision === 'match') {
        // Both matched! Upgrade to romantic/dating
        const updates: any = { status: 'dating', dating_started_at: new Date().toISOString() };
        if (isFriendship) {
          updates.relationship_track = 'romantic';
          updates.upgraded_to_romantic = true;
        }
        await supabase.from('connections').update(updates).eq('id', connectionId);
        await supabase.from('profiles').update({ relationship_status: 'dating', partner_user_id: otherUser.user_id } as any).eq('user_id', user!.id);
        await supabase.from('profiles').update({ relationship_status: 'dating', partner_user_id: user!.id } as any).eq('user_id', otherUser.user_id);
        await supabase.from('connection_timeline_events').insert({ connection_id: connectionId, event_type: 'dating_started', title: 'Started Dating 💕' });
        toast.success('🎉 You matched! You\'re now Dating!');
      } else {
        if (isFriendship) {
          // Reset back to friendship if not matched
          await supabase.from('connections').update({ matchmaking_unlocked_at: null } as any).eq('id', connectionId);
        }
        toast.info('Matchmaking complete.');
      }
    } else toast.success('Answers submitted! Waiting... 💕');
    setMmSubmitting(false);
  };

  // Marriage
  const submitMarriage = async (decision: 'yes' | 'not_yet') => {
    if (!connectionId) return;
    setMarSubmitting(true);
    const answersObj: Record<string, string> = {};
    marAnswers.forEach((a, i) => { answersObj[`q${i}`] = a; });
    if (marMyData) await supabase.from('marriage_sessions').update({ answers: answersObj, decision } as any).eq('id', marMyData.id);
    else await supabase.from('marriage_sessions').insert({ connection_id: connectionId, user_id: user!.id, answers: answersObj, decision } as any);
    setMarDecision(decision);
    setMarMyData({ ...marMyData, answers: answersObj, decision });
    if (marPartnerData?.decision) {
      if (decision === 'yes' && marPartnerData.decision === 'yes') {
        await supabase.from('connections').update({ status: 'married', married_at: new Date().toISOString() } as any).eq('id', connectionId);
        await supabase.from('profiles').update({ relationship_status: 'married', partner_user_id: otherUser.user_id } as any).eq('user_id', user!.id);
        await supabase.from('profiles').update({ relationship_status: 'married', partner_user_id: user!.id } as any).eq('user_id', otherUser.user_id);
        await supabase.from('connection_timeline_events').insert({ connection_id: connectionId, event_type: 'married', title: 'Married 💍' });
        toast.success('💍 Congratulations! You\'re now Married!');
      } else toast.info('Marriage session complete.');
    } else toast.success('Answers submitted! Waiting... 💍');
    setMarSubmitting(false);
  };

  const getDaysTogether = () => connection ? Math.floor((Date.now() - new Date(connection.created_at).getTime()) / 86400000) : 0;
  const getDaysFriendship = () => connection?.friendship_started_at ? Math.floor((Date.now() - new Date(connection.friendship_started_at).getTime()) / 86400000) : getDaysTogether();
  const getDaysDating = () => connection?.dating_started_at ? Math.floor((Date.now() - new Date(connection.dating_started_at).getTime()) / 86400000) : 0;
  
  // Matchmaking unlock logic
  // Romantic (invite): after 7 days or dating request accepted
  // Friendship (discover): ONLY when dating request accepted (matchmaking_unlocked_at set)
  const hasPendingOrAcceptedDatingRequest = !!datingRequest || connection?.status === 'dating';
  const matchmakingUnlocked = isRomantic 
    ? (getDaysTogether() >= 7 || hasPendingOrAcceptedDatingRequest)
    : !!(connection as any)?.matchmaking_unlocked_at;
  const marriageUnlocked = connection?.status === 'dating' && getDaysDating() >= 180;

  if (!connection || !otherUser) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;

  const daysTogether = getDaysTogether();
  const daysFriendship = getDaysFriendship();
  const milestoneLabels = isRomantic ? romanticMilestoneLabels : friendshipMilestoneLabels;
  const milestoneDays = isFriendship ? daysFriendship : daysTogether;
  const statusLabel = connection.status === 'married' ? '💍 Married' : connection.status === 'dating' ? '💜 Dating' : isFriendship ? '🤝 Friends' : '💚 Connected';
  const achieved = milestoneLabels.filter(m => milestoneDays >= m.days);
  const next = milestoneLabels.find(m => milestoneDays < m.days);

  // Build tabs based on relationship track
  const tabs = [
    { value: 'wall', icon: <MessageCircle size={12} />, label: 'Chat' },
    { value: 'question', icon: <HelpCircle size={12} />, label: 'Daily Q' },
    { value: 'memories', icon: <Camera size={12} />, label: isFriendship ? 'Memories' : 'Memories' },
    { value: 'games', icon: <Gamepad2 size={12} />, label: 'Games' },
    { value: 'music', icon: <Music size={12} />, label: 'Music' },
    { value: 'milestones', icon: <Trophy size={12} />, label: 'Miles' },
  ];
  // Only show surprises for romantic connections
  if (isRomantic) {
    tabs.splice(4, 0, { value: 'surprises', icon: <Gift size={12} />, label: 'Gifts' });
  }
  if (matchmakingUnlocked) tabs.push({ value: 'matchmaking', icon: <Sparkles size={12} />, label: 'Match' });
  if (marriageUnlocked && isRomantic) tabs.push({ value: 'marriage', icon: <Crown size={12} />, label: 'Marry' });

  // Can show "Start Dating" button for friendship connections or connected romantic connections
  const canShowDatingButton = (isFriendship && connection.status !== 'dating' && !datingRequest) || 
    (isRomantic && connection.status === 'connected' && !datingRequest);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-3 bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/chats')}><ArrowLeft size={20} /></Button>
        <div className="w-9 h-9 rounded-full lovli-gradient flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden cursor-pointer"
          onClick={() => navigate(`/u/${otherUser.username}`)}>
          {otherUser.avatar_url ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" /> : otherUser.full_name?.[0] || '?'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{otherUser.full_name}</p>
          <p className="text-[10px] text-muted-foreground">{statusLabel} • {milestoneDays}d {isFriendship ? '🤝' : '💕'}</p>
        </div>
        <div className="flex gap-1">
          {canShowDatingButton && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={sendDatingRequest} title="Start Dating">
              <HeartHandshake size={14} className="text-primary" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reportUser}><Flag size={14} className="text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBlockConfirm(true)}><Ban size={14} className="text-destructive" /></Button>
        </div>
      </div>

      {/* Dating request banner */}
      {datingRequest && datingRequest.requester_id !== user?.id && (
        <div className="p-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <HeartHandshake size={16} className="text-primary" />
          <p className="text-xs flex-1">{otherUser.full_name} wants to start dating!</p>
          <Button size="sm" className="h-7 text-xs rounded-xl lovli-gradient text-primary-foreground" onClick={() => respondDatingRequest(true)}>Accept 💜</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs rounded-xl" onClick={() => respondDatingRequest(false)}>Decline</Button>
        </div>
      )}
      {datingRequest && datingRequest.requester_id === user?.id && (
        <div className="p-2 bg-primary/5 border-b border-primary/10 text-center">
          <p className="text-xs text-muted-foreground">Waiting for {otherUser.full_name} to respond to your dating request... 💜</p>
        </div>
      )}

      <Tabs defaultValue="wall" className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto shrink-0">
          <TabsList className="flex mx-3 mt-2 w-max gap-0.5">
            {tabs.map(t => <TabsTrigger key={t.value} value={t.value} className="text-[9px] gap-0.5 px-2">{t.icon}<span className="hidden sm:inline">{t.label}</span></TabsTrigger>)}
          </TabsList>
        </div>

        {/* Chat */}
        <TabsContent value="wall" className="flex-1 flex flex-col overflow-hidden m-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={messagesContainerRef} onScroll={() => { if (isNearBottom()) setShowNewMsgIndicator(false); }}>
            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Start chatting! 💬</p>}
            {messages.filter(msg => !myDeletions.has(msg.id)).map(msg => {
              const isMine = msg.sender_id === user?.id;
              const isDeletedForEveryone = msg.is_deleted_for_everyone;
              const isSticker = msg.message_type === 'sticker';
              const replyMsg = msg.reply_to_message_id ? messages.find(m => m.id === msg.reply_to_message_id) : null;
              const reactions = msgReactions[msg.id] || [];
              const QUICK_EMOJIS = ['❤️', '😂', '😮', '👍', '😢', '🔥'];

              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="relative group max-w-[75%] transition-transform"
                    style={{ transform: swipingMsgId === msg.id ? `translateX(${swipeOffset}px)` : 'translateX(0)' }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      (e.currentTarget as any)._swipeX = touch.clientX;
                      (e.currentTarget as any)._swipeStarted = false;
                    }}
                    onTouchMove={(e) => {
                      const startX = (e.currentTarget as any)._swipeX;
                      if (startX === undefined) return;
                      const diff = e.touches[0].clientX - startX;
                      if (diff > 10 && !isDeletedForEveryone) {
                        (e.currentTarget as any)._swipeStarted = true;
                        setSwipingMsgId(msg.id);
                        setSwipeOffset(Math.min(diff * 0.5, 60));
                      }
                    }}
                    onTouchEnd={(e) => {
                      const startX = (e.currentTarget as any)._swipeX;
                      if (startX === undefined) return;
                      const endX = e.changedTouches[0].clientX;
                      if (endX - startX > 80 && !isDeletedForEveryone) {
                        setReplyToMsg(msg);
                      }
                      setSwipingMsgId(null);
                      setSwipeOffset(0);
                    }}
                  >
                    {/* Reply context */}
                    {replyMsg && !isDeletedForEveryone && (
                      <div className={`text-[10px] px-2 py-1 mb-0.5 rounded-t-xl border-l-2 border-primary/50 bg-muted/50 truncate ${isMine ? 'text-right' : ''}`}>
                        <span className="font-bold">{replyMsg.sender_id === user?.id ? 'You' : otherUser?.full_name}</span>
                        <span className="ml-1 text-muted-foreground">{replyMsg.content?.substring(0, 40)}{(replyMsg.content?.length || 0) > 40 ? '...' : ''}</span>
                      </div>
                    )}

                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? 'lovli-gradient text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'} ${isDeletedForEveryone ? 'opacity-50 italic' : ''}`}>
                      {isDeletedForEveryone ? (
                        <span className="text-xs">🚫 This message was deleted</span>
                      ) : editingMsg === msg.id ? (
                        <div className="flex gap-1">
                          <Input value={editMsgText} onChange={e => setEditMsgText(e.target.value)} className="rounded-xl text-xs h-7 bg-primary-foreground/20 text-inherit border-0" onKeyDown={e => e.key === 'Enter' && editMessage(msg.id)} />
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-inherit" onClick={() => editMessage(msg.id)}>✓</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-inherit" onClick={() => setEditingMsg(null)}>✕</Button>
                        </div>
                      ) : isSticker ? (
                        <img src={msg.content} alt="sticker" className="w-24 h-24 object-contain" />
                      ) : msg.message_type === 'voice' ? (
                        <audio controls src={msg.content} className="w-full max-w-[200px] h-8" />
                      ) : (
                        msg.content
                      )}
                      <div className={`text-[9px] mt-1 flex items-center gap-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.edited_at && <span>(edited)</span>}
                        {isMine && !isDeletedForEveryone && (
                          <CheckCheck size={12} className={msg.is_read ? 'text-blue-400' : 'opacity-50'} />
                        )}
                      </div>
                    </div>

                    {/* Reactions display */}
                    {reactions.length > 0 && (
                      <div className={`flex gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(reactions.reduce((acc: Record<string, number>, r: any) => {
                          acc[r.reaction] = (acc[r.reaction] || 0) + 1; return acc;
                        }, {})).map(([emoji, count]) => (
                          <span key={emoji} className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 border border-border">
                            {emoji} {(count as number) > 1 ? String(count) : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions button - show for all non-deleted messages */}
                    {!isDeletedForEveryone && (
                      <button className={`absolute -top-1 ${isMine ? '-left-1' : '-right-1'} opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-card rounded-full p-0.5 shadow-sm`}
                        onClick={() => setMsgMenu(msgMenu === msg.id ? null : msg.id)}>
                        <MoreHorizontal size={12} />
                      </button>
                    )}

                    {/* Context menu */}
                    {msgMenu === msg.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className={`absolute top-full ${isMine ? 'right-0' : 'left-0'} mt-1 bg-card border border-border rounded-xl shadow-lg p-1 z-10 space-y-0.5 min-w-[140px]`}>
                        {/* Quick reaction bar */}
                        <div className="flex gap-0.5 px-1 py-1 border-b border-border">
                          {QUICK_EMOJIS.map(e => (
                            <button key={e} className="text-sm hover:scale-125 transition-transform" onClick={() => addReaction(msg.id, e)}>{e}</button>
                          ))}
                          <button className="text-xs hover:scale-110" onClick={() => setShowMsgReactions(msg.id)}>➕</button>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 w-full justify-start" onClick={() => { setReplyToMsg(msg); setMsgMenu(null); }}>
                          <Reply size={10} className="mr-1" /> Reply
                        </Button>
                        {isMine && msg.message_type === 'text' && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 w-full justify-start" onClick={() => { setEditingMsg(msg.id); setEditMsgText(msg.content); setMsgMenu(null); }}>
                            <Pencil size={10} className="mr-1" /> Edit
                          </Button>
                        )}
                        {msg.message_type === 'text' && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 w-full justify-start" onClick={() => copyMessage(msg.content)}>
                            <Copy size={10} className="mr-1" /> Copy
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 w-full justify-start text-muted-foreground" onClick={() => deleteForMe(msg.id)}>
                          <Trash2 size={10} className="mr-1" /> Delete for me
                        </Button>
                        {isMine && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 w-full justify-start text-destructive" onClick={() => deleteForEveryone(msg.id)}>
                            <Trash2 size={10} className="mr-1" /> Delete for everyone
                          </Button>
                        )}
                      </motion.div>
                    )}

                    {/* Full emoji reaction picker */}
                    {showMsgReactions === msg.id && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className={`absolute top-full ${isMine ? 'right-0' : 'left-0'} mt-1 bg-card border border-border rounded-xl shadow-lg p-2 z-20 grid grid-cols-8 gap-1 max-w-[240px]`}>
                        {['❤️','😍','😂','😮','😢','😡','👍','👎','🔥','💯','🙏','😊','🥰','😘','🤔','😏','😎','🤩','🥺','😤','💀','🙄','😈','💕','✨','🎉','👀','💪'].map(emoji => (
                          <button key={emoji} className="text-lg hover:scale-125 transition-transform p-0.5" onClick={() => addReaction(msg.id, emoji)}>{emoji}</button>
                        ))}
                        <button className="text-xs col-span-8 text-center text-muted-foreground mt-1" onClick={() => setShowMsgReactions(null)}>Close</button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* New messages indicator */}
          {showNewMsgIndicator && (
            <div className="flex justify-center py-1 shrink-0">
                <Button size="sm" variant="secondary" className="rounded-full text-xs h-7 shadow-md" onClick={() => scrollToBottom()}>
                ↓ New messages
              </Button>
            </div>
          )}

          {/* Reply preview bar */}
          {replyToMsg && (
            <div className="px-3 py-2 bg-muted/50 border-t border-border flex items-center gap-2 shrink-0">
              <Reply size={14} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary">{replyToMsg.sender_id === user?.id ? 'You' : otherUser?.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{replyToMsg.content?.substring(0, 60)}</p>
              </div>
              <button onClick={() => setReplyToMsg(null)}><X size={14} className="text-muted-foreground" /></button>
            </div>
          )}

          <div className="p-3 border-t border-border bg-card flex gap-2 shrink-0">
            <Button size="icon" variant="ghost" className="rounded-xl shrink-0 h-10 w-10" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Smile size={18} />
            </Button>
            <Button size="icon" variant={isRecording ? 'destructive' : 'outline'} className="rounded-xl shrink-0" onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
            </Button>
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="rounded-xl flex-1" onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <Button size="icon" onClick={sendMessage} className="rounded-xl lovli-gradient text-primary-foreground shrink-0"><Send size={18} /></Button>
          </div>

          {showEmojiPicker && (
            <div className="shrink-0">
              <EmojiStickerPicker
                onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                onStickerSelect={async (url) => {
                  if (!connectionId) return;
                  await supabase.from('connection_messages').insert({
                    connection_id: connectionId, sender_id: user!.id, content: url, message_type: 'sticker',
                  } as any);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </TabsContent>

        {/* Daily Question */}
        <TabsContent value="question" className="flex-1 overflow-y-auto p-4 m-0">
          {dailyQuestion ? (
            <div className="space-y-4">
              <Card className="lovli-gradient border-0 shadow-md"><CardContent className="p-4"><p className="text-xs text-primary-foreground/80 font-semibold mb-1">Today's Question 💭</p><p className="text-primary-foreground font-bold">{dailyQuestion.question}</p></CardContent></Card>
              {!hasAnswered ? (
                <div className="space-y-3">
                  <Textarea placeholder="Your answer..." value={myAnswer} onChange={e => setMyAnswer(e.target.value)} className="rounded-xl" />
                  <Button onClick={submitDailyAnswer} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">Submit Answer</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Card className="shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground font-semibold mb-1">Your Answer</p><p className="text-sm">{myAnswer}</p></CardContent></Card>
                  {partnerAnswer ? (
                    <Card className="shadow-sm border-primary/20"><CardContent className="p-4"><p className="text-xs text-primary font-semibold mb-1">{otherUser.full_name}'s Answer 💕</p><p className="text-sm">{partnerAnswer}</p></CardContent></Card>
                  ) : (
                    <Card className="shadow-sm"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Waiting for {otherUser.full_name}... 🤫</p></CardContent></Card>
                  )}
                </div>
              )}
            </div>
          ) : <p className="text-center text-muted-foreground text-sm">No questions available</p>}
        </TabsContent>

        {/* Memories */}
        <TabsContent value="memories" className="flex-1 overflow-y-auto p-4 m-0">
          <div className="space-y-4">
            <Card className="shadow-sm"><CardContent className="p-4 space-y-3">
              <p className="text-sm font-bold">{isFriendship ? 'Add a Friendship Memory 📸' : 'Add a Memory 📸'}</p>
              <Input placeholder="Caption (optional)" value={memoryCaption} onChange={e => setMemoryCaption(e.target.value)} className="rounded-xl" />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadMemory(e.target.files[0]); }} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingMemory} className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold">
                <Image size={16} className="mr-2" /> {uploadingMemory ? 'Uploading...' : 'Choose Photo'}
              </Button>
            </CardContent></Card>
            {memories.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">{isFriendship ? 'No friendship memories yet 🤝' : 'No memories yet 💕'}</p> : (
              <div className="grid grid-cols-2 gap-2">
                {memories.map(mem => (
                  <div key={mem.id} className="relative rounded-xl overflow-hidden shadow-sm">
                    <img src={mem.image_url} alt={mem.caption || ''} className="w-full aspect-square object-cover" />
                    {mem.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2"><p className="text-[10px] text-white">{mem.caption}</p></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Games - uses currentGames based on relationship track */}
        <TabsContent value="games" className="flex-1 overflow-y-auto p-4 m-0">
          {activeGame ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{allGames.find(g => g.id === activeGame)?.name}</h3>
                <Button variant="ghost" size="sm" onClick={() => { setActiveGame(null); setGamePromptIdx(0); setGameSessionId(null); setGameAnswers({}); setGameCompleted(false); }}><X size={16} /></Button>
              </div>

              {gameCompleted ? (
                <div className="space-y-3">
                  <Card className="lovli-gradient border-0 shadow-md"><CardContent className="p-4 text-center">
                    <Trophy size={24} className="mx-auto text-primary-foreground mb-2" />
                    <p className="text-primary-foreground font-bold">Game Complete! 🎉</p>
                  </CardContent></Card>
                  {allGames.find(g => g.id === activeGame)?.prompts.map((prompt, i) => (
                    <Card key={i} className="shadow-sm"><CardContent className="p-3 space-y-1">
                      <p className="text-xs font-bold text-muted-foreground">{prompt}</p>
                      <p className="text-xs"><span className="font-bold">You:</span> {gameAnswers[i] || '-'}</p>
                      <p className="text-xs"><span className="font-bold">{otherUser.full_name}:</span> {partnerGameAnswers[i] || 'Not answered yet'}</p>
                    </CardContent></Card>
                  ))}
                </div>
              ) : (
                <>
                  <Card className="lovli-gradient border-0 shadow-lg">
                    <CardContent className="p-6 text-center">
                      <p className="text-[10px] text-primary-foreground/70 mb-2">Question {gamePromptIdx + 1} of {allGames.find(g => g.id === activeGame)?.prompts.length}</p>
                      <p className="text-primary-foreground font-bold text-lg">{allGames.find(g => g.id === activeGame)?.prompts[gamePromptIdx]}</p>
                    </CardContent>
                  </Card>

                  {(activeGame === 'thisorthat' || activeGame === 'friendthisthat') ? (
                    <div className="space-y-2">
                      {allGames.find(g => g.id === activeGame)?.prompts[gamePromptIdx]?.split(' or ').map((choice, i) => (
                        <Button key={i} variant="outline" className="w-full rounded-2xl h-12 text-sm font-bold" onClick={() => handleThisOrThatAnswer(choice.replace('?', '').trim())}>
                          {choice.replace('?', '').trim()}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Type your answer..."
                        value={gameCurrentAnswer}
                        onChange={e => setGameCurrentAnswer(e.target.value)}
                        className="rounded-xl min-h-[80px]"
                      />
                      <Button
                        onClick={submitGameAnswer}
                        disabled={!gameCurrentAnswer.trim()}
                        className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold"
                      >
                        {gamePromptIdx < (allGames.find(g => g.id === activeGame)?.prompts.length || 0) - 1 ? 'Next ✨' : 'Finish 🎉'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-muted-foreground">{isFriendship ? 'Choose a Friendly Game 🎮' : 'Choose a Game 🎮'}</p>
              {currentGames.map(game => (
                <Card key={game.id} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => startGame(game.id)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl lovli-gradient flex items-center justify-center text-primary-foreground"><Gamepad2 size={20} /></div>
                    <div><p className="text-sm font-bold">{game.name}</p><p className="text-xs text-muted-foreground">{game.desc}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Surprises - romantic only */}
        {isRomantic && (
          <TabsContent value="surprises" className="flex-1 overflow-y-auto p-4 m-0">
            <SurpriseMessages connectionId={connectionId!} userId={user!.id} otherUserId={otherUser.user_id} otherUserName={otherUser.full_name} />
          </TabsContent>
        )}

        {/* Music / Our Playlist */}
        <TabsContent value="music" className="flex-1 overflow-y-auto p-4 m-0">
          <SharedSongs connectionId={connectionId!} />
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones" className="flex-1 overflow-y-auto p-4 m-0">
          <div className="space-y-4">
            <Card className="lovli-gradient border-0 shadow-lg"><CardContent className="p-5 text-center">
              <p className="text-primary-foreground/80 text-xs font-semibold">You & {otherUser.full_name}</p>
              <p className="text-4xl font-bold text-primary-foreground mt-1">{milestoneDays}</p>
              <p className="text-primary-foreground/90 text-sm font-semibold">{isFriendship ? 'Days as Friends 🤝' : 'Days Together 💕'}</p>
            </CardContent></Card>
            {next && (
              <Card className="shadow-sm border-primary/20"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Next Milestone</p>
                <div className="flex items-center gap-3"><span className="text-2xl">{next.emoji}</span><div className="flex-1"><p className="text-sm font-bold">{next.label}</p><p className="text-xs text-muted-foreground">{next.days - milestoneDays} days to go</p></div></div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full lovli-gradient rounded-full transition-all" style={{ width: `${Math.min(100, (milestoneDays / next.days) * 100)}%` }} /></div>
              </CardContent></Card>
            )}
            <p className="text-sm font-bold text-muted-foreground">Achieved 🏆</p>
            {achieved.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">First milestone coming soon!</p> : (
              <div className="space-y-2">{[...achieved].reverse().map(m => (
                <Card key={m.days} className="shadow-sm"><CardContent className="p-3 flex items-center gap-3"><span className="text-2xl">{m.emoji}</span><p className="text-sm font-bold">{m.label}</p><Heart size={14} className="text-primary ml-auto" fill="currentColor" /></CardContent></Card>
              ))}</div>
            )}
          </div>
        </TabsContent>

        {/* Matchmaking */}
        {matchmakingUnlocked && (
          <TabsContent value="matchmaking" className="flex-1 overflow-y-auto p-4 m-0">
            <div className="space-y-4">
              <Card className="lovli-gradient border-0 shadow-md"><CardContent className="p-4 text-center">
                <Sparkles size={24} className="mx-auto text-primary-foreground mb-2" />
                <p className="text-primary-foreground font-bold">Matchmaking Room 💕</p>
                <p className="text-primary-foreground/80 text-xs">{milestoneDays} days connected. Ready for more?</p>
              </CardContent></Card>
              {mmDecision ? (
                <Card className="shadow-sm"><CardContent className="p-4 space-y-3">
                  <p className="text-sm font-bold">Your Decision: {mmDecision === 'match' ? '❤️ Match!' : '🤍 Not now'}</p>
                  {mmPartnerData?.decision ? (
                    <>
                      <p className="text-sm font-bold">{otherUser.full_name}: {mmPartnerData.decision === 'match' ? '❤️ Match!' : '🤍 Not now'}</p>
                      {mmDecision === 'match' && mmPartnerData.decision === 'match' && (
                        <div className="text-center p-4 bg-accent rounded-xl"><p className="text-xl font-bold lovli-text-gradient">🎉 It's a Match!</p><p className="text-sm text-muted-foreground">You're now Dating!</p></div>
                      )}
                      {matchmakingQuestions.map((q, i) => (
                        <Card key={i} className="shadow-sm"><CardContent className="p-3 space-y-1">
                          <p className="text-xs font-bold text-muted-foreground">{q}</p>
                          <p className="text-xs"><span className="font-bold">You:</span> {(mmMyData?.answers as any)?.[`q${i}`] || '-'}</p>
                          <p className="text-xs"><span className="font-bold">{otherUser.full_name}:</span> {(mmPartnerData?.answers as any)?.[`q${i}`] || '-'}</p>
                        </CardContent></Card>
                      ))}
                    </>
                  ) : <p className="text-sm text-muted-foreground">Waiting for {otherUser.full_name}... 🤫</p>}
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {matchmakingQuestions.map((q, i) => (
                    <div key={i} className="space-y-1"><p className="text-sm font-bold">{i + 1}. {q}</p>
                      <Textarea placeholder="Your answer..." value={mmAnswers[i]} onChange={e => { const next = [...mmAnswers]; next[i] = e.target.value; setMmAnswers(next); }} className="rounded-xl text-sm min-h-[60px]" /></div>
                  ))}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => submitMatchmaking('not_now')} disabled={mmSubmitting}>🤍 Not Now</Button>
                    <Button className="flex-1 rounded-2xl h-11 lovli-gradient text-primary-foreground font-bold" onClick={() => submitMatchmaking('match')} disabled={mmSubmitting || mmAnswers.some(a => !a.trim())}>❤️ Match!</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Marriage - romantic only */}
        {marriageUnlocked && isRomantic && (
          <TabsContent value="marriage" className="flex-1 overflow-y-auto p-4 m-0">
            <div className="space-y-4">
              <Card className="lovli-gradient border-0 shadow-md"><CardContent className="p-4 text-center">
                <Crown size={24} className="mx-auto text-primary-foreground mb-2" />
                <p className="text-primary-foreground font-bold">Marriage Room 💍</p>
                <p className="text-primary-foreground/80 text-xs">Dating for {getDaysDating()} days. Ready for forever?</p>
              </CardContent></Card>
              {marDecision ? (
                <Card className="shadow-sm"><CardContent className="p-4 space-y-3">
                  <p className="text-sm font-bold">Your Decision: {marDecision === 'yes' ? '💍 Yes!' : '🤍 Not yet'}</p>
                  {marPartnerData?.decision ? (
                    <>
                      <p className="text-sm font-bold">{otherUser.full_name}: {marPartnerData.decision === 'yes' ? '💍 Yes!' : '🤍 Not yet'}</p>
                      {marDecision === 'yes' && marPartnerData.decision === 'yes' && (
                        <div className="text-center p-4 bg-accent rounded-xl"><p className="text-xl font-bold lovli-text-gradient">💍 Congratulations!</p><p className="text-sm text-muted-foreground">You're now Married!</p></div>
                      )}
                      {marriageQuestions.map((q, i) => (
                        <Card key={i} className="shadow-sm"><CardContent className="p-3 space-y-1">
                          <p className="text-xs font-bold text-muted-foreground">{q}</p>
                          <p className="text-xs"><span className="font-bold">You:</span> {(marMyData?.answers as any)?.[`q${i}`] || '-'}</p>
                          <p className="text-xs"><span className="font-bold">{otherUser.full_name}:</span> {(marPartnerData?.answers as any)?.[`q${i}`] || '-'}</p>
                        </CardContent></Card>
                      ))}
                    </>
                  ) : <p className="text-sm text-muted-foreground">Waiting for {otherUser.full_name}... 🤫</p>}
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {marriageQuestions.map((q, i) => (
                    <div key={i} className="space-y-1"><p className="text-sm font-bold">{i + 1}. {q}</p>
                      <Textarea placeholder="Your answer..." value={marAnswers[i]} onChange={e => { const next = [...marAnswers]; next[i] = e.target.value; setMarAnswers(next); }} className="rounded-xl text-sm min-h-[60px]" /></div>
                  ))}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => submitMarriage('not_yet')} disabled={marSubmitting}>🤍 Not Yet</Button>
                    <Button className="flex-1 rounded-2xl h-11 lovli-gradient text-primary-foreground font-bold" onClick={() => submitMarriage('yes')} disabled={marSubmitting || marAnswers.some(a => !a.trim())}>💍 Yes!</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Safety Modal */}
      <Dialog open={showSafetyModal} onOpenChange={setShowSafetyModal}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield size={20} className="text-primary" /> Date Safety Mode 🛡️</DialogTitle>
            <DialogDescription>Please review these safety tips:</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {['✅ Meet in a public place first', '✅ Tell a trusted person', "✅ Don't go to private homes first meeting", '✅ Avoid exchanging money', '✅ Trust your instincts'].map(tip => <p key={tip}>{tip}</p>)}
          </div>
          <DialogFooter>
            <Button className="w-full rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={() => { setSafetyAccepted(true); setShowSafetyModal(false); }}>I Understand ✓</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Block {otherUser?.full_name}?</DialogTitle>
            <DialogDescription>They won't be able to message you.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setShowBlockConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-2xl" onClick={() => { blockUser(); setShowBlockConfirm(false); }}>Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dating prompt dialog */}
      <Dialog open={showDatingPrompt} onOpenChange={setShowDatingPrompt}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HeartHandshake size={20} className="text-primary" /> Start Dating? 💜</DialogTitle>
            <DialogDescription>{otherUser?.full_name} wants to start dating you! Do you agree?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => respondDatingRequest(false)}>Not Now</Button>
            <Button className="flex-1 rounded-2xl lovli-gradient text-primary-foreground font-bold" onClick={() => respondDatingRequest(true)}>Yes! 💜</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mic Permission Modal */}
      <MicPermissionModal open={showMicModal} onOpenChange={setShowMicModal} onRetry={retryMicPermission} errorType={micErrorType} />
    </div>
  );
};

export default ConnectionSpacePage;
