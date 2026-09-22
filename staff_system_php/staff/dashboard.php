<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_staff();
include '../includes/header.php';

$stmt = $pdo->prepare("SELECT record_status FROM staff_details WHERE staff_id = ?");
$stmt->execute([$_SESSION['staff_id']]);
$rec = $stmt->fetch();
$status = $rec ? strtoupper($rec['record_status']) : 'NOT STARTED';
?>
<div class="row mt-4">
    <div class="col-md-4">
        <div class="card shadow-sm text-center py-4">
            <h2 class="text-primary">Profile Status</h2>
            <div class="mt-3 h4"><span class="badge bg-secondary"><?= $status ?></span></div>
            <div class="mt-4"><a href="profile.php" class="btn btn-primary">Go to Profile Form</a></div>
        </div>
    </div>
    <div class="col-md-8">
        <div class="card shadow-sm"><div class="card-body">
            <h4>Welcome to your Staff Dashboard</h4>
            <p class="text-muted">Use this portal to manage your employee records and securely communicate with HR/Admin.</p>
            <hr>
            <a href="chat.php" class="btn btn-outline-info">Open Admin Chat</a>
        </div></div>
    </div>
</div>
<?php include '../includes/footer.php'; ?>