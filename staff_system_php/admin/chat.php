<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_admin();

$staff_list = $pdo->query("SELECT s.id, sd.full_name, s.email FROM staff s LEFT JOIN staff_details sd ON s.id=sd.staff_id")->fetchAll();
$target_id = $_GET['staff_id'] ?? ($staff_list[0]['id'] ?? 0);

if($_SERVER['REQUEST_METHOD'] == 'POST' && !empty($_POST['body']) && $target_id) {
    verify_csrf();
    $body = sanitize($_POST['body']);
    $pdo->prepare("INSERT INTO messages (sender_id, sender_role, receiver_id, receiver_role, body) VALUES (?, 'admin', ?, 'staff', ?)")->execute([$_SESSION['admin_id'], $target_id, $body]);
    header("Location: chat.php?staff_id=$target_id"); exit;
}

if(isset($_GET['del_msg'])) {
    $pdo->prepare("DELETE FROM messages WHERE id=?")->execute([$_GET['del_msg']]);
    header("Location: chat.php?staff_id=$target_id"); exit;
}

if($target_id) {
    $stmt = $pdo->prepare("SELECT * FROM messages WHERE (sender_id=? AND sender_role='staff') OR (receiver_id=? AND receiver_role='staff') ORDER BY sent_at ASC");
    $stmt->execute([$target_id, $target_id]);
    $msgs = $stmt->fetchAll();
} else { $msgs = []; }

include '../includes/header.php';
?>
<div class="row">
    <div class="col-md-4">
        <div class="list-group shadow-sm">
            <div class="list-group-item bg-dark text-white">Staff Members</div>
            <?php foreach($staff_list as $s): ?>
                <a href="?staff_id=<?= $s['id'] ?>" class="list-group-item list-group-item-action <?= $s['id']==$target_id?'active':'' ?>">
                    <?= htmlspecialchars($s['full_name'] ?: $s['email']) ?>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
    <div class="col-md-8">
        <div class="card shadow-sm"><div class="card-header bg-info text-white"><h5>Conversation</h5></div>
        <div class="card-body">
            <div class="chat-container mb-3">
                <?php foreach($msgs as $m): ?>
                    <?php if($m['sender_role'] == 'admin'): ?>
                        <div class="msg-admin text-end"><span class="bg-primary text-white p-2 rounded-3 d-inline-block position-relative">
                            <a href="?staff_id=<?= $target_id ?>&del_msg=<?= $m['id'] ?>" class="text-white text-decoration-none" title="Delete" style="position:absolute; top:-5px; right:-10px;">&times;</a>
                            <?= nl2br(htmlspecialchars($m['body'])) ?> <br><small style="font-size:0.7em"><?= $m['sent_at'] ?></small>
                        </span></div>
                    <?php else: ?>
                        <div class="msg-staff text-start"><span class="bg-light text-dark p-2 rounded-3 border d-inline-block position-relative">
                            <a href="?staff_id=<?= $target_id ?>&del_msg=<?= $m['id'] ?>" class="text-danger text-decoration-none" title="Delete" style="position:absolute; top:-5px; left:-10px;">&times;</a>
                            <?= nl2br(htmlspecialchars($m['body'])) ?> <br><small class="text-muted" style="font-size:0.7em"><?= $m['sent_at'] ?></small>
                        </span></div>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
            <?php if($target_id): ?>
            <form method="post" class="d-flex">
                <?php csrf_field(); ?>
                <input type="text" name="body" class="form-control me-2" placeholder="Type reply..." required>
                <button class="btn btn-primary">Send</button>
            </form>
            <?php endif; ?>
        </div></div>
    </div>
</div>
<?php include '../includes/footer.php'; ?>