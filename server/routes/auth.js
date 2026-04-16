// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', requireAuth, (req, res) => {
  const { newPassword } = req.body;   // On accepte seulement newPassword pour le premier changement

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  const newHash = bcrypt.hashSync(newPassword, 12);

  db.prepare(`
    UPDATE users 
    SET password_hash = ?, must_change_password = 0 
    WHERE id = ?
  `).run(newHash, req.user.id);

  // Supprimer toutes les autres sessions de cet utilisateur
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(req.user.id);

  // Log dans l'historique
  db.prepare(`
    INSERT INTO history (id, user_id, user_name, action, detail, ip_address)
    VALUES (?, ?, ?, 'Changement de mot de passe', 'Premier changement après création', ?)
  `).run(uuidv4(), req.user.id, req.user.name, req.ip);

  res.json({ 
    success: true, 
    message: 'Mot de passe mis à jour avec succès' 
  });
});