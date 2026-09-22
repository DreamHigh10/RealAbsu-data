<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff DB System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @media print { .no-print { display: none !important; } }
        body { background-color: #f8f9fa; }
        .chat-container { height: 400px; overflow-y: auto; background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; }
        .msg-staff { text-align: left; margin-bottom: 10px; }
        .msg-staff span { background: #e9ecef; padding: 8px 12px; border-radius: 15px; display: inline-block; }
        .msg-admin { text-align: right; margin-bottom: 10px; }
        .msg-admin span { background: #0d6efd; color: #fff; padding: 8px 12px; border-radius: 15px; display: inline-block; }
    </style>
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4 no-print">
    <div class="container">
        <a class="navbar-brand" href="/staff_system_php/index.php">Staff Portal</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navb"><span class="navbar-toggler-icon"></span></button>
        <div class="collapse navbar-collapse" id="navb">
            <ul class="navbar-nav me-auto">
                <li class="nav-item"><a class="nav-link" href="/staff_system_php/index.php">News</a></li>
            </ul>
            <div class="d-flex">
                <?php if(!empty($_SESSION['admin_id'])): ?>
                    <a href="/staff_system_php/admin/dashboard.php" class="btn btn-sm btn-outline-light me-2">Admin Dashboard</a>
                    <a href="/staff_system_php/admin/logout.php" class="btn btn-sm btn-danger">Logout</a>
                <?php elseif(!empty($_SESSION['staff_id'])): ?>
                    <a href="/staff_system_php/staff/dashboard.php" class="btn btn-sm btn-outline-light me-2">My Dashboard</a>
                    <a href="/staff_system_php/staff/logout.php" class="btn btn-sm btn-danger">Logout</a>
                <?php else: ?>
                    <a href="/staff_system_php/staff/login.php" class="btn btn-sm btn-outline-light me-2">Staff Login</a>
                    <a href="/staff_system_php/admin/login.php" class="btn btn-sm btn-outline-secondary">Admin</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</nav>
<div class="container pb-5">