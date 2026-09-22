<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_admin();

$totStaff = $pdo->query("SELECT COUNT(*) FROM staff")->fetchColumn();
$statusData = $pdo->query("SELECT status, COUNT(*) as count FROM staff GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);
$deptData = $pdo->query("SELECT d.name, COUNT(sd.id) as count FROM departments d LEFT JOIN staff_details sd ON d.id = sd.department_id GROUP BY d.id")->fetchAll(PDO::FETCH_ASSOC);

include '../includes/header.php';
?>
<h2 class="mb-4">Admin Dashboard</h2>
<div class="row mb-4">
    <div class="col-md-4">
        <div class="card text-bg-primary shadow-sm"><div class="card-body"><h5>Total Registered Staff</h5><h2 class="mb-0"><?= $totStaff ?></h2></div></div>
    </div>
    <div class="col-md-4">
        <a href="staff_list.php" class="text-decoration-none"><div class="card text-bg-success shadow-sm"><div class="card-body"><h5>Manage Staff</h5><p class="mb-0 text-white">View and approve records</p></div></div></a>
    </div>
    <div class="col-md-4">
        <a href="news.php" class="text-decoration-none"><div class="card text-bg-warning shadow-sm"><div class="card-body"><h5>Manage News</h5><p class="mb-0 text-dark">Post announcements</p></div></div></a>
    </div>
</div>
<div class="row">
    <div class="col-md-6 mb-4">
        <div class="card shadow-sm"><div class="card-body">
            <h5 class="card-title">Staff Account Status</h5>
            <canvas id="statusChart"></canvas>
        </div></div>
    </div>
    <div class="col-md-6 mb-4">
        <div class="card shadow-sm"><div class="card-body">
            <h5 class="card-title">Staff by Department</h5>
            <canvas id="deptChart"></canvas>
        </div></div>
    </div>
</div>
<script>
const statData = <?= json_encode($statusData) ?>;
const dpData = <?= json_encode($deptData) ?>;

new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
        labels: statData.map(d => d.status.toUpperCase()),
        datasets: [{ data: statData.map(d => d.count), backgroundColor: ['#ffc107', '#198754', '#dc3545'] }]
    }
});
new Chart(document.getElementById('deptChart'), {
    type: 'bar',
    data: {
        labels: dpData.map(d => d.name),
        datasets: [{ label: 'Staff Count', data: dpData.map(d => d.count), backgroundColor: '#0d6efd' }]
    }
});
</script>
<?php include '../includes/footer.php'; ?>