<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_admin();

if(isset($_GET['action']) && isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    if($_GET['action'] == 'approve') $pdo->prepare("UPDATE staff SET status='active' WHERE id=?")->execute([$id]);
    if($_GET['action'] == 'suspend') $pdo->prepare("UPDATE staff SET status='suspended' WHERE id=?")->execute([$id]);
    if($_GET['action'] == 'approve_form') $pdo->prepare("UPDATE staff_details SET record_status='approved' WHERE staff_id=?")->execute([$id]);
    if($_GET['action'] == 'delete') {
        $pdo->prepare("DELETE FROM staff WHERE id=?")->execute([$id]);
    }
    header("Location: staff_list.php"); exit;
}

$sql = "SELECT s.id, s.staff_id_number, s.email, s.status as acc_status, sd.full_name, sd.record_status, d.name as dept 
        FROM staff s LEFT JOIN staff_details sd ON s.id = sd.staff_id LEFT JOIN departments d ON sd.department_id = d.id";
$staff = $pdo->query($sql)->fetchAll();

include '../includes/header.php';
?>
<div class="d-flex justify-content-between align-items-center mb-4">
    <h2>Staff Directory</h2>
    <div class="no-print">
        <a href="export_csv.php" class="btn btn-success">Export CSV</a>
        <button onclick="window.print()" class="btn btn-secondary">Export PDF</button>
    </div>
</div>
<div class="card shadow-sm"><div class="card-body">
<div class="table-responsive">
<table class="table table-bordered table-striped align-middle">
    <thead class="table-dark"><tr><th>ID Num</th><th>Name</th><th>Email</th><th>Dept</th><th>Acc Status</th><th>Form Status</th><th class="no-print">Actions</th></tr></thead>
    <tbody>
        <?php foreach($staff as $row): ?>
        <tr>
            <td><?= htmlspecialchars($row['staff_id_number']) ?></td>
            <td><?= htmlspecialchars($row['full_name'] ?? 'Not filled') ?></td>
            <td><?= htmlspecialchars($row['email']) ?></td>
            <td><?= htmlspecialchars($row['dept'] ?? '-') ?></td>
            <td>
                <span class="badge bg-<?= $row['acc_status']=='active'?'success':($row['acc_status']=='pending'?'warning text-dark':'danger') ?>">
                    <?= strtoupper($row['acc_status']) ?>
                </span>
            </td>
            <td><?= strtoupper($row['record_status'] ?? 'NONE') ?></td>
            <td class="no-print">
                <?php if($row['acc_status'] !== 'active'): ?>
                    <a href="?action=approve&id=<?= $row['id'] ?>" class="btn btn-sm btn-success">Activate</a>
                <?php else: ?>
                    <a href="?action=suspend&id=<?= $row['id'] ?>" class="btn btn-sm btn-danger">Suspend</a>
                <?php endif; ?>
                <?php if($row['record_status'] == 'submitted'): ?>
                    <a href="?action=approve_form&id=<?= $row['id'] ?>" class="btn btn-sm btn-primary">Approve Form</a>
                <?php endif; ?>
                <a href="chat.php?staff_id=<?= $row['id'] ?>" class="btn btn-sm btn-info text-white">Chat</a>
                <a href="?action=delete&id=<?= $row['id'] ?>" onclick="return confirm('Delete staff entirely?')" class="btn btn-sm btn-dark">Del</a>
            </td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
</div></div></div>
<?php include '../includes/footer.php'; ?>