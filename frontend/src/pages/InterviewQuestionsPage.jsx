import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewQuestions } from '../api/client';
import QuestionCard from '../components/QuestionCard';

function Section({ title, count, children }) {
  return (
    <section className="glass-card rounded-[2rem] p-6">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-300 mb-5">
        {title} {count !== undefined ? `(${count})` : ''}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function InterviewQuestionsPage() {
  const { candidateId, jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    interviewQuestions.get(candidateId, jobId)
      .then((res) => {
        if (active && res.data.success) setData(res.data.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [candidateId, jobId]);

  const questions = data?.questions || {};
  const plainText = useMemo(() => {
    const lines = [`Interview Questions - ${data?.candidateName || 'Candidate'} x ${data?.jobTitle || 'Role'}`, ''];
    (questions.technical_questions || []).forEach((q, i) => lines.push(`Technical ${i + 1}. ${q.question}\nHint: ${q.expected_answer_hint || ''}`));
    (questions.hr_questions || []).forEach((q, i) => lines.push(`HR ${i + 1}. ${q.question}\nPurpose: ${q.purpose || ''}`));
    (questions.situational_questions || []).forEach((q, i) => lines.push(`Situational ${i + 1}. ${q.question}\nLook for: ${q.what_to_look_for || ''}`));
    (questions.red_flags_to_probe || []).forEach((flag, i) => lines.push(`Red flag ${i + 1}. ${flag}`));
    return lines.join('\n\n');
  }, [data, questions]);

  const generateQuestions = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await interviewQuestions.generate({ candidateId, jobId, difficulty: 'Mid' });
      if (res.data.success) setData(res.data.data);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(plainText);
    setMessage('Questions copied');
  };

  const exportTxt = () => {
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-questions-${candidateId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="glass-card rounded-[2rem] p-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="mb-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-200">
              &lt;- Back
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300 mb-2">Interview Questions</p>
            <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight">
              {data?.candidateName || 'Candidate'} x {data?.jobTitle || 'Role'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={generateQuestions} disabled={generating} className="premium-btn px-5 py-3 rounded-2xl text-white text-xs font-bold disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate Questions'}
            </button>
            <button onClick={copyAll} disabled={!data} className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-200 text-xs font-bold disabled:opacity-40">Copy All</button>
            <button onClick={exportTxt} disabled={!data} className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-200 text-xs font-bold disabled:opacity-40">Export</button>
          </div>
        </header>

        {message && <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-center text-sm font-bold text-indigo-200">{message}</div>}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => <div key={item} className="h-32 rounded-[2rem] bg-white/5 animate-pulse" />)}
          </div>
        ) : !data ? (
          <div className="glass-card rounded-[2rem] p-12 text-center">
            <h2 className="text-2xl font-black text-white mb-2">Questions not generated yet</h2>
            <p className="text-sm text-slate-500 mb-6">Generate tailored technical, HR, and situational questions for this candidate.</p>
            <button onClick={generateQuestions} disabled={generating} className="premium-btn px-6 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Technical Questions" count={questions.technical_questions?.length || 0}>
              {(questions.technical_questions || []).map((q, i) => (
                <QuestionCard key={i} type={`Q${i + 1}`} question={q.question} hint={q.expected_answer_hint} difficulty={q.difficulty} topic={q.topic} />
              ))}
            </Section>
            <Section title="HR Questions" count={questions.hr_questions?.length || 0}>
              {(questions.hr_questions || []).map((q, i) => (
                <QuestionCard key={i} type={`Q${i + 1}`} question={q.question} purpose={q.purpose} />
              ))}
            </Section>
            <Section title="Situational Questions" count={questions.situational_questions?.length || 0}>
              {(questions.situational_questions || []).map((q, i) => (
                <QuestionCard key={i} type={`Q${i + 1}`} question={q.question} hint={q.what_to_look_for} />
              ))}
            </Section>
            <Section title="Red Flags To Probe" count={questions.red_flags_to_probe?.length || 0}>
              {(questions.red_flags_to_probe || []).length ? questions.red_flags_to_probe.map((flag, i) => (
                <div key={i} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">{flag}</div>
              )) : <p className="text-sm text-slate-500">No specific red flags generated.</p>}
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}
