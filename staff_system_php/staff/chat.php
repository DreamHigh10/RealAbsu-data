<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_staff();
$staff_id = $_SESSION['staff_id'];

if($_SERVER['REQUEST_METHOD'] == 'POST' && !empty($_POST['body'])) {
    verify_csrf();
    $body = sanitize($_POST['body']);
    $pdo->prepare("INSERT INTO messages (sender_id, sender_role, receiver_id, receiver_role, body) VALUES (?, 'staff', 1, 'admin', ?)")->execute([$staff_id, $body]);
    header("Location: chat.php"); exit;
}

$stmt = $pdo->prepare("SELECT * FROM messages WHERE (sender_id=? AND sender_role='staff') OR (receiver_id=? AND receiver_role='staff') ORDER BY sent_at ASC");
$stmt->execute([$staff_id, $staff_id]);
$msgs = $stmt->fetchAll();

include '../includes/header.php';
?>
<div class="row justify-content-center"><div class="col-md-8">
    <div class="card shadow-sm"><div class="card-header bg-info text-white"><h5>Chat with Admin</h5></div>
    <div class="card-body">
        <div class="chat-container mb-3">
            <?php foreach($msgs as $m): ?>
                <?php if($m['sender_role'] == 'staff'): ?>
                    <div class="msg-staff text-end"><span><?= nl2br(htmlspecialchars($m['body'])) ?> <br><small class="text-muted" style="font-size:0.7em"><?= $m['sent_at'] ?></small></span></div>
                <?php else: ?>
                    <div class="msg-admin text-start"><span><?= nl2br(htmlspecialchars($m['body'])) ?> <br><small class="text-light" style="font-size:0.7em"><?= $m['sent_at'] ?></small></span></div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
        <form method="post" class="d-flex">
            <?php csrf_field(); ?>
            <input type="text" name="body" class="form-control me-2" placeholder="Type message..." required>
            <button class="btn btn-primary">Send</button>
        </form>
    </div></div>
</div></div>
<?php include '../includes/footer.php'; ?>