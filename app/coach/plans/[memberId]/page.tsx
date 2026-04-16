"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";

export default function CoachPlanDetailPage() {
  const params = useParams<{ memberId: string }>();
  const router = useRouter();
  const {
    state: { session, members, memberProfile, weeklyPlan, coachEdits },
    applyCoachEdit,
    selectMember,
    isBootstrapped,
    isSaving,
  } = useDemo();
  const memberId = params.memberId;
  const targetMember = useMemo(() => members.find((item) => item.id === memberId), [memberId, members]);
  const [selectedDayId, setSelectedDayId] = useState(weeklyPlan.days[0]?.id ?? "");
  const selectedDay = weeklyPlan.days.find((day) => day.id === selectedDayId) ?? weeklyPlan.days[0];
  const [form, setForm] = useState({
    focus: selectedDay?.focus ?? "",
    intensity: selectedDay?.intensity ?? "",
    coachNote: selectedDay?.coachNote ?? "",
    reason: "",
  });

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "coach") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  useEffect(() => {
    if (memberId) {
      void selectMember(memberId);
    }
  }, [memberId, selectMember]);

  useEffect(() => {
    if (!selectedDay) return;
    setSelectedDayId(selectedDay.id);
    setForm({
      focus: selectedDay.focus,
      intensity: selectedDay.intensity,
      coachNote: selectedDay.coachNote,
      reason: "",
    });
  }, [selectedDay]);

  return (
    <StaffLayout currentPath="/coach/plans" role="coach">
      <section className="staff-header">
        <div>
          <p className="eyebrow">计划详情</p>
          <h1>{targetMember?.memberName ?? memberProfile.memberName}</h1>
          <p>这是独立详情页。教练可直接修改计划，并必须填写会员可见修改理由。</p>
        </div>
      </section>

      <section className="staff-grid-two">
        <article className="panel">
          <h2>当前计划结构</h2>
          <div className="schedule-table">
            {weeklyPlan.days.map((day) => (
              <div className="schedule-row" key={day.id}>
                <div><strong>{day.dayLabel}</strong><p>{day.focus}</p></div>
                <div>{day.intensity}</div>
                <div>{day.coachNote}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>编辑表单</h2>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedDay) return;
              void applyCoachEdit({
                memberId,
                dayId: selectedDay.id,
                focus: form.focus,
                intensity: form.intensity,
                coachNote: form.coachNote,
                reason: form.reason,
              }).then((success) => {
                if (success) setForm((current) => ({ ...current, reason: "" }));
              });
            }}
          >
            <label className="field field-wide">
              <span>训练日</span>
              <select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
                {weeklyPlan.days.map((day) => (
                  <option key={day.id} value={day.id}>{day.dayLabel} · {day.focus}</option>
                ))}
              </select>
            </label>
            <label className="field field-wide"><span>训练重点</span><input value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} /></label>
            <label className="field"><span>强度</span><input value={form.intensity} onChange={(event) => setForm({ ...form, intensity: event.target.value })} /></label>
            <label className="field field-wide"><span>教练备注</span><textarea rows={3} value={form.coachNote} onChange={(event) => setForm({ ...form, coachNote: event.target.value })} /></label>
            <label className="field field-wide"><span>会员可见修改理由</span><textarea rows={4} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
            <div className="submit-row field-wide"><button className="button-primary" disabled={isSaving} type="submit">提交修改</button></div>
          </form>
        </article>
      </section>

      <section className="panel">
        <h2>最近修改记录</h2>
        <div className="edit-list">
          {coachEdits.map((edit) => (
            <article className="edit-card" key={edit.id}>
              <p><span className="label-inline">{edit.exercise}</span> {edit.reason}</p>
              <p>{edit.coachVersion}</p>
            </article>
          ))}
        </div>
      </section>
    </StaffLayout>
  );
}
