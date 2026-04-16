"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { demoAccounts } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-store";

const routeByRole = {
  member: "/member",
  coach: "/coach",
  admin: "/admin",
} as const;

export default function LoginPage() {
  const router = useRouter();
  const {
    state: { session },
    isBootstrapped,
    isSaving,
    login,
  } = useDemo();
  const [username, setUsername] = useState<string>(demoAccounts[0].username);
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isBootstrapped && session.isAuthenticated && session.role) {
      router.replace(routeByRole[session.role]);
    }
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div>
          <p className="eyebrow">PulseLab Login</p>
          <h1>按身份进入对应界面</h1>
          <p className="hero-copy">
            这版已经接入基础登录态。会员、教练、管理员会进入不同入口，不再依赖手动角色切换。
          </p>
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            void login(username, password).then((ok) => {
              if (!ok) {
                setError("用户名或密码错误");
              }
            });
          }}
        >
          <label className="field field-wide">
            <span>示例账号</span>
            <select
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setPassword("123456");
              }}
            >
              {demoAccounts.map((account) => (
                <option key={account.username} value={account.username}>
                  {account.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-wide">
            <span>用户名</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="empty-state field-wide">{error}</div> : null}
          <div className="submit-row field-wide">
            <button className="button-primary" disabled={isSaving} type="submit">
              登录
            </button>
            <span className="helper-text">默认密码均为 `123456`。</span>
          </div>
        </form>
      </div>
    </div>
  );
}
