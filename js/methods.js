/* The seven trainers, each embedded in the three-phase framework (paper §5, Tab. 2, Codes 2-6).
   Numbers in the result cards are read from data/paper.json at runtime, not typed here. */
window.METHODS = [
  {
    key: "fewstepgrpo", name: "FewStepGRPO", cls: "grp", estimator: "v-ind · replayed trajectory", sampler: "SDE rollout",
    orig: "FlowGRPO", origNote: "GRPO group baseline + PPO on the transition density of an SDE sampler (Liu et al., 2025)",
    sec: "§5.3",
    one: String.raw`A replay-based surrogate of FlowGRPO. The stochastic few-step rollout keeps its \(M_{\mathrm{step}}\) transitions; every inner iteration replays one stored \((x_t,x_r,t,r)\), redraws only the flow-map query level \(s\), and scores \(x_r\) with an Euler–Maruyama Gaussian whose mean is the differentiated prediction.`,
    transform: String.raw`<p>FlowGRPO optimises a clipped PPO surrogate on the realised transition \(x_r\) of the SDE sampler,</p>
      $$\mathcal L_{\mathrm{GRPO}}=-\mathbb E\Big[\min\big\{A\rho_{\mathrm{tr}},\;A\operatorname{clip}(\rho_{\mathrm{tr}},1\pm\varepsilon_{\mathrm{clip}})\big\}\Big],\qquad \rho_{\mathrm{tr}}=\frac{p_\theta^{\mathrm{tr}}(x_r\mid x_t)}{p_{\mathrm{old}}^{\mathrm{tr}}(x_r\mid x_t)} .$$
      <p>In x-space the differentiated quantity is not a clean prediction but the <b>mean of the scoring kernel at level \(r\)</b>, an explicitly marked level-\(r\) point:</p>
      $$\mu_\theta=\alpha_t\,x_t-b_t\big(u_\theta(x_t,t,s)+J\big),\quad \alpha_t=1-\tfrac{\varsigma_t^2}{2t}\Delta t,\quad b_t=\Big(1+\tfrac{\varsigma_t^2(1-t)}{2t}\Big)\Delta t,\quad \sigma_{\mathrm k}=\varsigma_t\sqrt{\Delta t},$$
      <p class="note">with \(\Delta t=t-r\) and the same detached \(J=J[u_{\mathrm{old}},t,s]\) in \(\mu_\theta\) and \(\mu_{\mathrm{old}}\), evaluated on the replay trajectory.</p>`,
    anchors: { x_z: String.raw`\mu_\theta`, x_reg: null, x_base: String.raw`\operatorname{sg}(\mu_\theta)`, x_rwd: String.raw`x_r` },
    weights: { W_reg: "0", W_rwd: String.raw`\bar\rho_{\mathrm{GRPO}}`, omega: String.raw`\dfrac{\chi_{\mathrm{GRPO}}\,A}{2\sigma_{\mathrm k}^2}` },
    weightNote: String.raw`\(\bar\rho_{\mathrm{GRPO}}=\exp\!\big[\big(\overline{(\mu_{\mathrm{old}}-x_r)^2}-\overline{(\mu_\theta-x_r)^2}\big)/2\sigma_{\mathrm k}^2\big]\) is a tempered surrogate scoring ratio, not a rollout importance weight; \(\chi_{\mathrm{GRPO}}\) is the unclipped-gradient gate, zero when \(A=0\). Here \(A\) is the clipped advantage \(\operatorname{clip}(A,-c_{\mathrm{adv}},c_{\mathrm{adv}})\).`,
    adapt: String.raw`<p><b>Stochastic sampler.</b> Each step moves from \(t_j\) to a level \(s_j\le t_{j+1}\) with the flow map and re-noises back to \(t_{j+1}\) on the linear path. <b>Replay query:</b> \(n_{\mathrm{it}}=M_{\mathrm{step}}\); one endpoint advantage supervises all transitions of a member. The estimator is <code>v-ind</code> on the replay trajectory. A <code>v-aux</code> variant is not used: \(v_\phi\) is fitted on endpoint-renoised states, not on replayed sampler states.</p>
      <p class="note">Settings: \(\varsigma=0.25\) (image) / \(0.7\) (video); \(\varepsilon_{\mathrm{clip}}=4\times10^{-3}\) (OCR), \(3\times10^{-3}\) (mixed), \(10^{-3}\) (video).</p>`,
    cost: ["M_step", 1, 1, 2, "—", 1, "—"],
    code: `class FewStepGRPO(FewStepRLTrainer):            # replaces Stage 1 and Stage 3(i)
    estimator = ReplayVInd()
    n_it = M_step

    def rollout(self, prompts):
        return sde_rollout(prompts, u_old, keep_transitions=True)
    def queries(self, batch):                   # replay; one A per member
        for x_t, x_r, t, r in batch.transitions:    # r: target level of the step
            s = draw_s(t)                           # s drawn as r in Stage 3(i)
            yield Query(batch, t=t, r=r, s=s, x_t=x_t, x_r=x_r)
    def anchors(self, q):
        v_th, v_old, _ = self.estimator.fields(q, r=q.s)  # the velocity at (t, s)
        a, b, q.tau = em_coeffs(q.t, q.r)       # alpha_t, b_t, sigma_k
        mu = a * q.x_t - b * v_th               # x_theta = mu_theta, differentiated
        q.mu_old = a * q.x_t - b * v_old        # enters the ratio only
        return Points(x_z=mu, x_reg=None, x_base=sg(mu), x_rwd=q.x_r)
    def weights(self, q, p):
        l_new = mean_sp((p.x_base - p.x_rwd) ** 2)
        l_old = mean_sp((q.mu_old - p.x_rwd) ** 2)
        rho_grpo = exp((l_old - l_new) / (2 * q.tau ** 2))
        chi_grpo = clip_gate(rho_grpo, q.A, clip_range)
        return 0., rho_grpo, chi_grpo * q.A / (2 * q.tau ** 2)`,
    facts: [
      String.raw`Raises the mixed training reward from 1.450 to 1.461 and HPSv3 from 10.30 to 11.58, whereas FlowGRPO with the average velocity substituted ends at 1.438 and HPSv3 9.62. <span class="src">§6.3</span>`,
      String.raw`With the OCR reward it reaches 0.776 at iteration 200 and does not cross 0.82 within the horizon. <span class="src">Tab. 6(a)</span>`,
      String.raw`On video it is the only group-advantage method that ends below the initialisation (15.89 vs. 16.54), and its TA drops from 1.85 to 1.23. <span class="src">Tab. 8</span>`,
      String.raw`Guidance: the FlowGRPO-style replay optimises slowly and has the weakest observed endpoints within the common budget. <span class="src">§6.6</span>`,
    ],
  },
  {
    key: "meanflowawm", name: "MeanFlowAWM", cls: "grp", estimator: "v-ind (shared J)", sampler: "ODE rollout",
    orig: "AWM", origNote: "Advantage Weighted Matching: the flow-matching loss on the model's own samples, weighted by the advantage (Xue et al., 2026)",
    sec: "§5.4",
    one: String.raw`AWM as one clipped reward-augmentation term on the matching residual of the few-step model: the average velocity regresses onto \(v_{\mathrm{cond}}-J\), the MeanFlow target with the conditional velocity in place of the teacher, weighted by the advantage.`,
    transform: String.raw`<p>In x-space AWM is a squared residual between the prediction and the rollout sample, weighted by the signed advantage, \(\mathcal L_{\mathrm{AWM}}=\mathbb E[A\,\tfrac{w(t)}{t^2}\|\tilde x_\theta-\hat x\|^2]\). With the few-step v-prediction</p>
      $$\tilde x_\theta=\tilde x_{\theta,\mathrm v}=X\big[\tilde x_t,\,u_\theta(\tilde x_t,t,r)+J[u_{\mathrm{old}},t,r],\,0\big],\qquad \tilde x_\theta-\hat x=-t\Big(u_\theta-\big(v_{\mathrm{cond}}-J\big)\Big).$$`,
    anchors: { x_z: String.raw`\tilde x_{\theta,\mathrm v}`, x_reg: null, x_base: String.raw`\operatorname{sg}(\tilde x_\theta)`, x_rwd: String.raw`\hat x` },
    weights: { W_reg: "0", W_rwd: String.raw`\rho_{\mathrm{AWM}}`, omega: String.raw`\dfrac{\chi_{\mathrm{AWM}}\,A}{2\tau_{\mathrm{AWM}}^2}` },
    weightNote: String.raw`\(\rho_{\mathrm{AWM}}=\exp\!\big[\big(\overline{(\tilde x_{\mathrm{ind}}-\hat x)^2}-\overline{(\tilde x_\theta-\hat x)^2}\big)/2\tau_{\mathrm{AWM}}^2\big]\) with \(\tau_{\mathrm{AWM}}=\max\{t,\tau_{\min}\}\). It is not an importance weight (\((\tilde x_t,\hat x)\) is not a rollout transition); through the gate \(\chi_{\mathrm{AWM}}\) it limits one-sided changes of the matching residual relative to \(u_{\mathrm{old}}\). Here \(A\) is the clipped advantage \(\operatorname{clip}(A,-c_{\mathrm{adv}},c_{\mathrm{adv}})\).`,
    adapt: String.raw`<p>Deterministic rollout; every inner iteration draws a fresh \((t,r,\epsilon)\) and re-noises the rewarded endpoint (\(n_{\mathrm{it}}=n_{\mathrm{ts}}=4\)). The old policy enters <b>only through the weights</b>, via the shared-\(J\) prediction \(\tilde x_{\mathrm{ind}}\), with \(\tilde x_\theta-\tilde x_{\mathrm{ind}}=-t(u_\theta-u_{\mathrm{old}})\). There is no self-regression term.</p>
      <p class="note">Settings: gate radius \(10^{-2}\) (OCR), \(2\times10^{-3}\) (mixed), \(10^{-3}\) (video); \(\tau_{\min}=10^{-2}\).</p>`,
    cost: ["n_ts", 1, 1, 2, "—", 1, "—"],
    code: `class FewStepAWM(FewStepRLTrainer):             # no self-regression; x_rwd = x_hat
    def anchors(self, q):
        v_th, v_old, v_b = self.estimator.fields(q)
        x_z = X(q.x_t, v_th, 0)
        q.x_old = X(q.x_t, v_old, 0)            # statistic only
        # baseline: the current prediction, or the prediction of v_phi
        x_base = sg(x_z) if v_b is None else X(q.x_t, v_b, 0)
        return Points(x_z=x_z, x_reg=None, x_base=x_base, x_rwd=q.x_hat)
    def weights(self, q, p):
        tau = clamp(q.t, min=TAU_MIN)           # tau_AWM = max(t, tau_min)
        l_new = mean_sp((sg(p.x_z) - p.x_rwd) ** 2)
        l_old = mean_sp((q.x_old - p.x_rwd) ** 2)
        rho_awm = exp((l_old - l_new) / (2 * tau ** 2))
        chi_awm = clip_gate(rho_awm, q.A, clip_range)
        return 0., rho_awm, chi_awm * q.A / (2 * tau ** 2)

class MeanFlowAWM(FewStepAWM): estimator = VInd()  # shared J`,
    facts: [
      String.raw`Reaches its best GenEval2 early, at iteration 100 (0.397, 11.8 h). <span class="src">§6.3</span>`,
      String.raw`With the OCR reward it reaches 0.802 at iteration 200 and does not cross 0.82 within the horizon. <span class="src">Tab. 6(a)</span>`,
      String.raw`Best on held-out VBench: overall 83.70 and semantic 77.04, the highest of the seven trainers. <span class="src">Tab. 8</span>`,
      String.raw`Guidance: AWM lies between GRPO and the DiffusionNFT family in the reported reward outcomes and uses a PPO-style clip to limit each update. <span class="src">§6.6</span>`,
    ],
  },
  {
    key: "dmdawm", name: "DMDAWM", cls: "grp", estimator: "v-aux (J = 0)", sampler: "ODE rollout",
    orig: "AWM", origNote: "Advantage Weighted Matching (Xue et al., 2026), with a DMD-style auxiliary velocity as the baseline",
    sec: "§5.4",
    one: String.raw`The <code>v-aux</code> variant of FewStepAWM: drop \(J\) and measure the reward displacement from the auxiliary network's prediction \(\tilde x_{\mathrm{aux}}\). Descent moves \(u_\theta\) along \(+A\,(v_{\mathrm{cond}}-v_\phi)\), with \(v_\phi\) acting as a learned per-sample baseline.`,
    transform: String.raw`<p>The x-space form is the AWM residual \(\mathcal L_{\mathrm{AWM}}=\mathbb E[A\,\tfrac{w(t)}{t^2}\|\tilde x_\theta-\hat x\|^2]\). DMDAWM uses the J-free \((t,r)\) query and the auxiliary baseline:</p>
      $$\tilde x_\theta=X[\tilde x_t,u_\theta(\tilde x_t,t,r),0],\qquad \frac{\partial\mathcal L}{\partial u_\theta}=\frac{\rho_{\mathrm{AWM}}\,\chi_{\mathrm{AWM}}\,A}{N}\,\frac{t^2}{\tau_{\mathrm{AWM}}^2}\,\big(v_\phi-v_{\mathrm{cond}}\big).$$`,
    anchors: { x_z: String.raw`X[\tilde x_t,u_\theta(\tilde x_t,t,r),0]`, x_reg: null, x_base: String.raw`\tilde x_{\mathrm{aux}}`, x_rwd: String.raw`\hat x` },
    weights: { W_reg: "0", W_rwd: String.raw`\rho_{\mathrm{AWM}}`, omega: String.raw`\dfrac{\chi_{\mathrm{AWM}}\,A}{2\tau_{\mathrm{AWM}}^2}` },
    weightNote: String.raw`\(\rho_{\mathrm{AWM}}\) is computed with the old policy's J-free prediction \(\tilde x_{\mathrm{ind}}|_{J=0}\). Keeping a detached \(J\) in both predictions would change only the scalar ratio and the gate, not the gradient direction, so the reported method omits it.`,
    adapt: String.raw`<p>The auxiliary velocity \(v_\phi\) is fitted to the old-policy rollouts by flow matching (learning rate \(10^{-5}\), \(n_{\mathrm{fm}}=5\) steps per outer iteration) before the policy update, so the baseline \(\tilde x_{\mathrm{aux}}\) follows the policy. No directional-difference evaluation of \(J\) is needed.</p>`,
    cost: ["n_ts", 1, 1, 0, 1, 1, "n_fm fwd+bwd of v_φ"],
    code: `class DMDAWM(FewStepAWM):      estimator = VAux()  # v_phi baseline, no J
# anchors():  x_base = X(q.x_t, v_phi, 0)  instead of  sg(x_z)
# weights():  identical to MeanFlowAWM (rho_AWM, chi_AWM, tau_AWM)`,
    facts: [
      String.raw`Fastest OCR rise among the group-advantage methods after iteration 50 (0.698 → 0.936 at iteration 200), consistent with no self-regression and a baseline that follows the policy. <span class="src">Tab. 6(a), §6.3</span>`,
      String.raw`The rise coincides with the largest held-out degradation: at its first checkpoint above OCR 0.82, HPSv3 drops from 12.86 to 5.05 and ImageReward from 1.233 to 0.092. <span class="src">Tab. 6(a)</span>`,
      String.raw`Cheaper per image iteration than MeanFlowAWM (304 vs. 425 s), but slower on video (821 vs. 737 s), where fitting \(v_\phi\) costs about 144 s per iteration. <span class="src">Tab. 7, Tab. 8</span>`,
    ],
    imageNote: "DMDAWM images carry a faint 16-px latent-patch lattice; they are shown after a Gaussian blur (σ = 2 px), with ImageReward recomputed on the blurred images.",
  },
  {
    key: "meanflownft", name: "MeanFlowNFT", cls: "grp", estimator: "v-ind (shared J)", sampler: "ODE rollout",
    orig: "DiffusionNFT", origNote: "Negative-aware fine-tuning: two implicit policies mixed by a bounded optimality weight (Zheng et al., 2026); the MeanFlowNFT construction follows Huang et al. (2026)",
    sec: "§5.5",
    one: String.raw`DiffusionNFT on an average-velocity policy. The two implicit branches become one <b>self-regression</b> toward the self-induced old prediction and one <b>signed reward augmentation</b> toward the rollout sample; a single detached \(J\), evaluated on the old policy, is shared by every prediction.`,
    transform: String.raw`<p>In x-space DiffusionNFT mixes two squared residuals to the model's sample, with the branches \(\tilde x^\pm_\theta=\tilde x_{\mathrm{old}}\pm\beta(\tilde x_\theta-\tilde x_{\mathrm{old}})\):</p>
      $$\mathcal L_{\mathrm{NFT}}=\mathbb E\Big[\tfrac{1}{t^2}\big(\hat r\,\|\tilde x^+_\theta-\hat x\|^2+(1-\hat r)\,\|\tilde x^-_\theta-\hat x\|^2\big)\Big],\qquad \hat r=\tfrac12+\tfrac12\operatorname{clip}(A,-1,1).$$`,
    anchors: { x_z: String.raw`\tilde x_{\theta,\mathrm v}=X[\tilde x_t,u_\theta+J,0]`, x_reg: String.raw`\tilde x_{\mathrm{ind}}`, x_base: String.raw`\tilde x_{\mathrm{ind}}`, x_rwd: String.raw`\hat x` },
    weights: { W_reg: String.raw`c_{\mathrm{adv}}\beta^2(a_++a_-)`, W_rwd: String.raw`W_{\mathrm{reg}}`, omega: String.raw`\dfrac{a_+-a_-}{\beta(a_++a_-)}` },
    weightNote: String.raw`\(a_+=\hat r/\gamma_+\), \(a_-=(1-\hat r)/\gamma_-\), with one adaptive normaliser \(\gamma_\pm\) per branch (the mean absolute residual of that branch). With \(\gamma_\pm=t^2\), \(c_{\mathrm{adv}}=1\) and the group-normalised \(A\) of §3.2 they reduce to the theoretical \(W=\beta^2/t^2\), \(\omega=\operatorname{clip}(A,-1,1)/\beta\). \(\beta=0.1\), \(c_{\mathrm{adv}}=5\).`,
    adapt: String.raw`<p>The shared detached \(J\) cancels inside both squares — in \(\mathcal L_{\mathrm{reg}}\) between the current and old predictions, in \(\mathcal L_{\mathrm{rwd}}\) between the two copies of the current prediction — but the reward displacement \(g_{\mathrm v}=\omega(\hat x-\tilde x_{\mathrm{ind}})\) retains it. Since \(J\) is detached, the Jacobian is that of \(X[\tilde x_t,u_\theta(\tilde x_t,t,r),0]\), and resampling \(r\) updates the full family \(u_\theta(\cdot,t,r)\).</p>`,
    cost: ["n_ts", 1, 1, 2, "—", 1, "—"],
    code: `class FewStepNFT(FewStepRLTrainer):             # both squares on; x_rwd = x_hat
    def anchors(self, q):
        v_th, v_old, v_b = self.estimator.fields(q)
        x_z, x_reg = X(q.x_t, v_th, 0), X(q.x_t, v_old, 0)   # same (t, r), same J
        # baseline: aliased to x_reg, or the prediction of v_phi
        x_base = x_reg if v_b is None else X(q.x_t, v_b, 0)
        return Points(x_z=x_z, x_reg=x_reg, x_base=x_base, x_rwd=q.x_hat)
    def branch_weights(self, q, p, x_pos, x_neg):
        dev = sg(p.x_z) - p.x_reg               # direction from x_reg, centre x_base
        g_pos = clamp(mean_sp(abs(p.x_base + beta * dev - x_pos)), min=eps_gamma)
        g_neg = clamp(mean_sp(abs(p.x_base - beta * dev - x_neg)), min=eps_gamma)
        return q.r_hat / g_pos, (1 - q.r_hat) / g_neg    # r_hat enters ONLY here
    def weights(self, q, p):
        a_pos, a_neg = self.branch_weights(q, p, p.x_rwd, p.x_rwd)
        W = c_adv * beta ** 2 * (a_pos + a_neg)
        return W, W, (a_pos - a_neg) / (beta * (a_pos + a_neg))

class MeanFlowNFT(FewStepNFT): estimator = VInd()  # x_z = x_v, x_reg = x_base = x_ind`,
    facts: [
      String.raw`Against DiffusionNFT with the average velocity substituted: training reward 1.509 vs. 1.440, HPSv3 13.23 vs. 11.79, ImageReward 1.385 vs. 1.317, best GenEval2 0.411 vs. 0.399 (within the ~0.03 resolution). <span class="src">§6.3</span>`,
      String.raw`OCR: the first to pass 0.85 (iteration 100) and the highest within 200 iterations (about 0.945 at iteration 150); at its first checkpoint above 0.82 it keeps the best held-out scores (HPSv3 10.64, ImageReward 0.887). <span class="src">Tab. 6(a)</span>`,
      String.raw`Highest held-out aesthetic score in the mixed setting (6.04). <span class="src">Tab. 6(b)</span>`,
      String.raw`Guidance: the DiffusionNFT family reached high rewards in relatively few iterations; MeanFlowNFT is the more expensive of the two on images (435 s/iter). <span class="src">§6.6</span>`,
    ],
  },
  {
    key: "dmdnft", name: "DMDNFT", cls: "grp", estimator: "v-aux", sampler: "ODE rollout",
    orig: "DiffusionNFT", origNote: "Negative-aware fine-tuning (Zheng et al., 2026), with a DMD-style auxiliary velocity as the baseline",
    sec: "§5.5",
    one: String.raw`The <code>v-aux</code> variant of FewStepNFT. Only the baseline changes, to the prediction of \(v_\phi\) fitted online to the old-policy rollouts, so the self-regression anchor and the reward baseline separate: \(\tilde x_{\mathrm{reg}}\neq\tilde x_{\mathrm{base}}\).`,
    transform: String.raw`<p>Same x-space objective as DiffusionNFT. Substituting \(v_\phi\) into the prediction would give \(\partial\tilde x_{\theta,\mathrm v}/\partial\theta=0\), so the current prediction is still computed from \(u_\theta\):</p>
      $$\frac{\partial\tilde x_{\theta,\mathrm v}}{\partial\theta}=\frac{\partial}{\partial\theta}X\big[\tilde x_t,u_\theta+J[u_{\mathrm{old}},t,r],0\big]=\frac{\partial}{\partial\theta}X[\tilde x_t,u_\theta,0].$$`,
    anchors: { x_z: String.raw`X[\tilde x_t,u_\theta(\tilde x_t,t,r),0]`, x_reg: String.raw`\tilde x_{\mathrm{ind}}|_{J=0}`, x_base: String.raw`\tilde x_{\mathrm{aux}}`, x_rwd: String.raw`\hat x` },
    weights: { W_reg: String.raw`c_{\mathrm{adv}}\beta^2(a_++a_-)`, W_rwd: String.raw`W_{\mathrm{reg}}`, omega: String.raw`\dfrac{a_+-a_-}{\beta(a_++a_-)}` },
    weightNote: String.raw`Same weights as MeanFlowNFT; the normalisers \(\gamma_\pm\) are centred at \(\tilde x_{\mathrm{base}}\) and displaced along \(\operatorname{sg}(\tilde x_\theta)-\tilde x_{\mathrm{reg}}\), because here \(\tilde x_{\mathrm{reg}}\neq\tilde x_{\mathrm{base}}\). \(J\) cancels in the self-regression square, and \(\tilde x_{\mathrm{aux}}\) contains no \(J\).`,
    adapt: String.raw`<p>\(v_\phi\) is fitted by flow matching to the rollouts of the old policy (learning rate \(10^{-5}\), \(n_{\mathrm{fm}}=5\) steps per outer iteration). No directional difference is evaluated, which saves up to 8 no-grad forwards of \(u_{\mathrm{old}}\) per member but adds the forward and backward passes of \(v_\phi\).</p>`,
    cost: ["n_ts", 1, 1, 0, 1, 1, "n_fm fwd+bwd of v_φ"],
    code: `class DMDNFT(FewStepNFT):      estimator = VAux()  # x_base = x_aux != x_reg
# anchors():  x_z = X(x_t, u_theta(x_t, t, r), 0);  x_reg = X(x_t, u_old(x_t, t, r), 0)
#             x_base = X(x_t, v_phi(x_t, t), 0);    x_rwd = x_hat`,
    facts: [
      String.raw`Highest training reward among the group-advantage methods in the mixed setting (1.519) and the best held-out HPSv3 of all trainers (13.49). <span class="src">Tab. 6(b)</span>`,
      String.raw`On video the most effective on the training reward (17.93, +1.39, leading three of four terms), but last on VBench overall (83.38) with the lowest dynamic degree (53.33). <span class="src">Tab. 8, Tab. S2</span>`,
      String.raw`Cost flips with the modality: 326 vs. 435 s/iter against MeanFlowNFT on images, but 821 vs. 734 s/iter on video. <span class="src">Tab. 7, Tab. 8</span>`,
    ],
  },
  {
    key: "fewstepopsd", name: "FewStepOPSD", cls: "rg", estimator: "v-ind, J cancels (dropped)", sampler: "ODE rollout + reward-coupled construction",
    orig: "DiffusionOPSD", origNote: "On-policy self-distillation onto points constructed from the reward gradient; requires a reward differentiable in the clean sample",
    sec: "§5.6",
    one: String.raw`DiffusionNFT onto <b>constructed</b> points. From the old policy's prediction, normalised reward-gradient steps inside a trust region build an ascent point \(\tilde x_+\) and a descent point \(\tilde x_-\); the policy is then fitted to them, so the update never back-propagates through the decoder or the reward model.`,
    transform: String.raw`<p>At one query state \(\tilde x_t=\operatorname{AddNoise}(\hat x,t)\) at a small noise level, \(M_{\mathrm{tgt}}\) normalised gradient steps are taken from \(\tilde x_{\mathrm{old}}\) in both directions and projected onto the ball of radius \(\kappa\|\tilde x_{\mathrm{old}}\|\):</p>
      $$\tilde x^{[m+1]}_\pm=\tilde x^{[m]}_\pm\pm h\,\frac{\nabla R(\mathcal D(\tilde x^{[m]}_\pm),c)}{\|\nabla R(\mathcal D(\tilde x^{[m]}_\pm),c)\|+\varepsilon_g},\qquad h=\frac{\eta\,\kappa\,\|\tilde x_{\mathrm{old}}\|}{M_{\mathrm{tgt}}} .$$
      <p>The two NFT branches are regressed onto these points, \(\mathcal L=a_+\|\tilde x^+_\theta-\tilde x_+\|^2+a_-\|\tilde x^-_\theta-\tilde x_-\|^2\), which decomposes into one self-regression and two reward augmentations.</p>`,
    anchors: { x_z: String.raw`X[\tilde x_t,u_\theta(\tilde x_t,t,r),0]`, x_reg: String.raw`\tilde x_{\mathrm{ind}}|_{J=0}`, x_base: String.raw`\tilde x_{\mathrm{ind}}|_{J=0}`, x_rwd: String.raw`\tilde x_+,\ \tilde x_-` },
    weights: { W_reg: String.raw`c_{\mathrm{adv}}\beta^2(a_++a_-)`, W_rwd: String.raw`W_{\mathrm{reg}}`, omega: String.raw`\Big(\tfrac{a_+}{\beta(a_++a_-)},\,-\tfrac{a_-}{\beta(a_++a_-)}\Big)` },
    weightNote: String.raw`\(|\omega_1|+|\omega_2|=1/\beta\) is fixed and \(\hat r\) only redistributes it between the ascent and the descent term. The signs are fixed by construction (+ for ascent, − for descent), not by the advantage; the normalisers \(\gamma_\pm\) are measured against \(\tilde x_\pm\). \(\hat r\) can still change the common weight \(W\) when \(\gamma_+\ne\gamma_-\); \(c_{\mathrm{adv}}\) scales \(W\) but not the split.`,
    adapt: String.raw`<p>The gradient steps start at the \(r=0\) prediction \(\tilde x_{\mathrm{old},\mathrm u}\), which does not depend on \(J\); only the resulting displacement is transferred to the anchor. Because both rewarded points are built from the anchor, \(J\) cancels in every square of the loss, so the reported v-form drops it (<code>VInd(cd=False)</code>) and reduces to the J-free \((t,r)\) query for every \((t,r)\). \(n_{\mathrm{it}}=1\); \(t\) is logit-normal with median 0.278 (5–95%: 0.125–0.508).</p>
      <p class="note">Settings: \(\kappa=0.1\), \(M_{\mathrm{tgt}}=2\), \(\eta=1\), \(\nabla R\) of the full training reward. On video: HPSv3-only gradient, fp32 reward model, 21 of 81 frames.</p>`,
    cost: [1, 1, 1, "0†", "—", 1, "2·M_tgt reward backwards"],
    code: `def tr_steps(x0, c, direction, M_tgt):          # trust-region reward-gradient steps
    radius = kappa * norm(x0); h = eta * radius / M_tgt
    x = x0
    for _ in range(M_tgt):
        grad_R = grad(reward(decode(x), c), x)  # through reward model AND decoder
        x = x + direction * h * grad_R / (norm(grad_R) + eps_g)
        d = x - x0
        x = x0 + d * clamp(radius / (norm(d) + eps_g), max=1.)
    return sg(x)

class FewStepOPSD(FewStepNFT):                  # NFT onto constructed points
    estimator = VInd(cd=False)                  # J cancels in the loss
    M_tgt, directions = 2, (+1, -1)
    def rollout(self, prompts):
        b = super().rollout(prompts)
        b.t, b.r = draw_t_logitnormal(b), draw_r(b)          # stored, one per member
        b.x_t = add_noise(b.x_hat, b.t)
        x_old = X(b.x_t, u_old(b.x_t, b.t, b.r), 0)          # the anchor
        shift = X(b.x_t, u_old(b.x_t, b.t, 0.), 0) - x_old
        b.x_pm = [tr_steps(x_old + shift, b.c, d, self.M_tgt) - shift
                  for d in self.directions]                  # detached
        return b
    def weights(self, q, p):
        a_pos, a_neg = self.branch_weights(q, p, *p.x_rwd)
        W = c_adv * beta ** 2 * (a_pos + a_neg)
        s = beta * (a_pos + a_neg)
        return W, W, (a_pos / s, -a_neg / s)    # |omega_1| + |omega_2| = 1/beta`,
    facts: [
      String.raw`Highest training reward in the mixed setting (1.450 → 1.641), the best ImageReward (1.476) and GenEval2 at iteration 400 (0.463), and with ReFL the only methods that raise CLIPScore in the default mixed-reward configuration (to 0.322). <span class="src">Tab. 6(b)</span>`,
      String.raw`Peaks on the held-out aesthetic score and HPSv3 by iteration 100; afterwards they decline while the training reward still rises — the onset of reward hacking. <span class="src">§6.3</span>`,
      String.raw`Not applicable with the OCR reward: OCR accuracy has no gradient with respect to the decoded sample. <span class="src">Tab. 6(a)</span>`,
      String.raw`On video the reward gradient is expensive and partial: training reward 16.26 (below the init), the highest TA (1.91), the best aesthetic quality (70.87) and background consistency (95.68), and 2623 GPU-h. <span class="src">Tab. 8, Tab. S2</span>`,
    ],
  },
  {
    key: "refl", name: "ReFL", cls: "rg", estimator: "v-ind, J cancels (dropped)", sampler: "ODE rollout + one ascent step",
    orig: "ReFL", origNote: "Reward feedback learning: back-propagate a differentiable reward through the last denoising step",
    sec: "§5.6, Ex. ReFL",
    one: String.raw`Reward feedback learning as the <b>proxy configuration of FewStepOPSD</b>: a single ascent step, no descent point, no self-regression, \(\hat r\equiv1\). Its direction is collinear with the classic ReFL gradient whenever \(\theta_{\mathrm{old}}=\theta\) (the first inner iteration after a refresh with EMA-decay ratio 0).`,
    transform: String.raw`<p>Classic ReFL maximises the reward of the one-evaluation prediction from a re-noised state:</p>
      $$\mathcal L_{\mathrm{ReFL}}=-\lambda\,\mathbb E\big[R(\mathcal D(\tilde x_\theta),c)\big],\qquad \nabla_\theta\mathcal L_{\mathrm{ReFL}}=-\lambda\Big(\frac{\partial\tilde x_\theta}{\partial\theta}\Big)^{\!\top}\nabla R\big(\mathcal D(\tilde x_\theta),c\big).$$
      <p>With \(M_{\mathrm{tgt}}=1\), \(W_{\mathrm{reg}}=0\) and only the ascent square, the OPSD gradient is \(\propto-(\partial\tilde x_\theta/\partial\theta)^\top\nabla R(\mathcal D(\tilde x_{\mathrm{old}}),c)\): it replaces \(\lambda\) by a detached positive factor and evaluates \(\nabla R\) at the old prediction, so the two coincide in direction when \(\theta_{\mathrm{old}}=\theta\).</p>`,
    anchors: { x_z: String.raw`X[\tilde x_t,u_\theta(\tilde x_t,t,r),0]`, x_reg: null, x_base: String.raw`\tilde x_{\mathrm{ind}}|_{J=0}`, x_rwd: String.raw`\tilde x_+` },
    weights: { W_reg: "0", W_rwd: String.raw`c_{\mathrm{adv}}\beta^2/\gamma_+`, omega: String.raw`+1/\beta` },
    weightNote: String.raw`No advantage is used (\(\hat r\equiv1\)); \(\omega_1=1/\beta>0\) is fixed by construction, and \(W_{\mathrm{rwd}}\) is detached and positive as the proxy allows.`,
    adapt: String.raw`<p>The single ascent step starts at the \(r=0\) prediction \(\tilde x_{\mathrm{old},\mathrm u}\), so \(\nabla R\) is evaluated there, and its displacement trains every \(u_\theta(\cdot,t,r)\). One step needs one detached rollout, one reward gradient, and one forward and backward pass of \(u_\theta\); \(J\) shifts both ends of the displacement equally and is dropped.</p>`,
    cost: [1, 1, 1, "0†", "—", 1, "1 reward backward"],
    code: `class ReFL(FewStepOPSD):                        # proxy configuration
    M_tgt, directions = 1, (+1,)                # one ascent step, no descent point
    def advantage(self, R, c):                  # r_hat = 1: no Stage 2
        return None, ones_like(R)
    def weights(self, q, p):                    # omega_1 = 1/beta, W_rwd = c_adv beta^2 / gamma_+
        a_pos, _ = self.branch_weights(q, p, p.x_rwd[0], p.x_rwd[0])
        return 0., c_adv * beta ** 2 * a_pos, (1. / beta,)
    def loss(self, p, W_reg, W_rwd, omega):     # W_reg = 0: ascent term only
        return reward_augmentation(p.x_z, p.x_rwd[0], p.x_base, omega[0], W_rwd)`,
    facts: [
      String.raw`Second-highest training reward (1.623) and the cheapest iteration of all trainers (219 s). <span class="src">Tab. 6(b), Tab. 7</span>`,
      String.raw`Best GenEval2 point estimate (0.465 at iteration 200, 12.2 h); the 0.002 gap to FewStepOPSD is below the 0.03 resolution. <span class="src">§6.3</span>`,
      String.raw`Highest held-out OCR accuracy in the mixed setting (0.546). <span class="src">Tab. 6(b)</span>`,
      String.raw`On video: second on VBench overall (83.69) and first on quality (85.40). Guidance: where the reward is differentiable and affordable, ReFL alone is already a strong baseline. <span class="src">Tab. 8, §6.6</span>`,
    ],
  },
];

/* Tab. 2: the components each trainer implements, stage by stage; column order = METHODS. */
window.COMPONENTS = {
  cols: ["FewStepGRPO", "MeanFlowAWM", "DMDAWM", "MeanFlowNFT", "DMDNFT", "FewStepOPSD", "ReFL"],
  rows: [
    ["<code>rollout</code>", "", ["SDE", "ODE", "ODE", "ODE", "ODE", String.raw`ODE with \(\tilde x_\pm\)`, String.raw`ODE with \(\tilde x_+\)`]],
    ["<code>advantage</code>", "", ["—", "—", "—", "—", "—", "—", String.raw`\(\hat r\equiv1\)`]],
    ["<code>queries</code>", "", [String.raw`\((t,s,r)\), \(s\) drawn as \(r\)`, String.raw`\((t,r)\)`, String.raw`\((t,r)\)`, String.raw`\((t,r)\)`, String.raw`\((t,r)\)`, String.raw`\((t,r)\)`, String.raw`\((t,r)\)`]],
    ["<code>anchors</code>", String.raw`\(\tilde x_{\mathrm{reg}}\)`, [String.raw`\(\varnothing\)`, String.raw`\(\varnothing\)`, String.raw`\(\varnothing\)`, String.raw`\(\tilde x_{\mathrm{ind}}\)`, String.raw`\(\tilde x_{\mathrm{ind}}|_{J=0}\)`, String.raw`\(\tilde x_{\mathrm{ind}}|_{J=0}\)`, String.raw`\(\varnothing\)`]],
    ["", String.raw`\(\tilde x_{\mathrm{base}}\)`, [String.raw`\(\operatorname{sg}(\mu_\theta)\)`, String.raw`\(\operatorname{sg}(\tilde x_\theta)\)`, String.raw`\(\tilde x_{\mathrm{aux}}\)`, String.raw`\(\tilde x_{\mathrm{ind}}\)`, String.raw`\(\tilde x_{\mathrm{aux}}\)`, String.raw`\(\tilde x_{\mathrm{ind}}|_{J=0}\)`, String.raw`\(\tilde x_{\mathrm{ind}}|_{J=0}\)`]],
    ["", String.raw`\(\tilde x_{\mathrm{rwd}}\)`, [String.raw`\(x_r\)`, String.raw`\(\hat x\)`, String.raw`\(\hat x\)`, String.raw`\(\hat x\)`, String.raw`\(\hat x\)`, String.raw`\(\tilde x_\pm\)`, String.raw`\(\tilde x_+\)`]],
    ["<code>weights</code>", String.raw`\(W_{\mathrm{reg}}\)`, ["0", "0", "0", String.raw`\(c_{\mathrm{adv}}\beta^2(a_++a_-)\)`, String.raw`\(c_{\mathrm{adv}}\beta^2(a_++a_-)\)`, String.raw`\(c_{\mathrm{adv}}\beta^2(a_++a_-)\)`, "0"]],
    ["", String.raw`\(W_{\mathrm{rwd}}\)`, [String.raw`\(\bar\rho_{\mathrm{GRPO}}\)`, String.raw`\(\rho_{\mathrm{AWM}}\)`, String.raw`\(\rho_{\mathrm{AWM}}\)`, String.raw`\(W_{\mathrm{reg}}\)`, String.raw`\(W_{\mathrm{reg}}\)`, String.raw`\(W_{\mathrm{reg}}\)`, String.raw`\(c_{\mathrm{adv}}\beta^2/\gamma_+\)`]],
    ["", String.raw`\(\omega\)`, [String.raw`\(\frac{\chi_{\mathrm{GRPO}}}{2\sigma_{\mathrm k}^2}A\)`, String.raw`\(\frac{\chi_{\mathrm{AWM}}}{2\tau_{\mathrm{AWM}}^2}A\)`, String.raw`\(\frac{\chi_{\mathrm{AWM}}}{2\tau_{\mathrm{AWM}}^2}A\)`, String.raw`\(\frac{a_+-a_-}{\beta(a_++a_-)}\)`, String.raw`\(\frac{a_+-a_-}{\beta(a_++a_-)}\)`, String.raw`\(\frac{(a_+,-a_-)}{\beta(a_++a_-)}\)`, String.raw`\(+1/\beta\)`]],
    ["<code>loss</code>", "", [String.raw`\(\mathcal L_{\mathrm{rwd}}\)`, String.raw`\(\mathcal L_{\mathrm{rwd}}\)`, String.raw`\(\mathcal L_{\mathrm{rwd}}\)`, String.raw`\(\mathcal L_{\mathrm{rwd}},\mathcal L_{\mathrm{reg}}\)`, String.raw`\(\mathcal L_{\mathrm{rwd}},\mathcal L_{\mathrm{reg}}\)`, String.raw`\(\mathcal L_{\mathrm{rwd},1},\mathcal L_{\mathrm{rwd},2},\mathcal L_{\mathrm{reg}}\)`, String.raw`\(\mathcal L_{\mathrm{rwd},1}\)`]],
    ["estimator", "", [String.raw`<code>v-ind</code>, replay traj.`, "<code>v-ind</code>", "<code>v-aux</code>", "<code>v-ind</code>", "<code>v-aux</code>", "<code>v-ind</code>", "<code>v-ind</code>"]],
  ],
};
