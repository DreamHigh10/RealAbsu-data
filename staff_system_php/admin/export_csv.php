<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_admin();
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="staff_export.csv"');
$out = fopen('php://output', 'w');
fputcsv($out, ['ID Number', 'Full Name', 'Email', 'Department', 'Position', 'Phone', 'Account Status', 'Form Status']);
$sql = "SELECT s.staff_id_number, sd.full_name, s.email, d.name, sd.position, sd.phone, s.status, sd.record_status 
        FROM staff s LEFT JOIN staff_details sd ON s.id = sd.staff_id LEFT JOIN departments d ON sd.department_id = d.id";
$stmt = $pdo->query($sql);
while($row = $stmt->fetch(PDO::FETCH_ASSOC)) fputcsv($out, $row);
fclose($out);
?>