<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_staff();

$staff_id = $_SESSION['staff_id'];
$stmt = $pdo->prepare("SELECT * FROM staff_details WHERE staff_id = ?");
$stmt->execute([$staff_id]);
$details = $stmt->fetch(PDO::FETCH_ASSOC);

$is_locked = ($details && in_array($details['record_status'], ['submitted', 'approved']));

if($_SERVER['REQUEST_METHOD'] == 'POST' && !$is_locked) {
    verify_csrf();
    $name = sanitize($_POST['full_name']);
    $dept = (int)$_POST['department_id'];
    $pos = sanitize($_POST['position']);
    $phone = sanitize($_POST['phone']);
    $dob = $_POST['dob'];
    $quals = sanitize($_POST['qualifications']);
    $emp_date = $_POST['date_of_employment'];
    $action = $_POST['action'] === 'submit' ? 'submitted' : 'draft';

    $photo_path = $details['photo_path'] ?? null;
    if(!empty($_FILES['photo']['name'])) {
        $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
        $photo_path = time().'_'.$staff_id.'.'.$ext;
        move_uploaded_file($_FILES['photo']['tmp_name'], "../uploads/staff_photos/".$photo_path);
    }

    if($details) {
        $sql = "UPDATE staff_details SET full_name=?, department_id=?, position=?, phone=?, dob=?, qualifications=?, date_of_employment=?, photo_path=?, record_status=?, submitted_at=NOW() WHERE staff_id=?";
        $pdo->prepare($sql)->execute([$name, $dept, $pos, $phone, $dob, $quals, $emp_date, $photo_path, $action, $staff_id]);
    } else {
        $sql = "INSERT INTO staff_details (staff_id, full_name, department_id, position, phone, dob, qualifications, date_of_employment, photo_path, record_status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())";
        $pdo->prepare($sql)->execute([$staff_id, $name, $dept, $pos, $phone, $dob, $quals, $emp_date, $photo_path, $action]);
    }
    header("Location: profile.php?success=1"); exit;
}

$depts = $pdo->query("SELECT * FROM departments")->fetchAll();
include '../includes/header.php';
?>
<div class="card shadow-sm max-w-2xl mx-auto mt-4">
    <div class="card-header bg-primary text-white"><h5>My Profile Details</h5></div>
    <div class="card-body">
        <?php if(isset($_GET['success'])) echo "<div class='alert alert-success'>Saved successfully!</div>"; ?>
        <?php if($is_locked) echo "<div class='alert alert-warning'>Your record is locked for review. You can no longer edit it.</div>"; ?>
        
        <form method="post" enctype="multipart/form-data">
            <?php csrf_field(); ?>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Full Name</label><input type="text" name="full_name" class="form-control" value="<?= $details['full_name']??'' ?>" <?= $is_locked?'readonly':'' ?> required></div>
                <div class="col-md-6 mb-3"><label>Department</label>
                    <select name="department_id" class="form-select" <?= $is_locked?'disabled':'' ?> required>
                        <option value="">Select...</option>
                        <?php foreach($depts as $d): ?>
                            <option value="<?= $d['id'] ?>" <?= (($details['department_id']??'')==$d['id'])?'selected':'' ?>><?= htmlspecialchars($d['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Position</label><input type="text" name="position" class="form-control" value="<?= $details['position']??'' ?>" <?= $is_locked?'readonly':'' ?> required></div>
                <div class="col-md-6 mb-3"><label>Phone Number</label><input type="text" name="phone" class="form-control" value="<?= $details['phone']??'' ?>" <?= $is_locked?'readonly':'' ?> required></div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Date of Birth</label><input type="date" name="dob" class="form-control" value="<?= $details['dob']??'' ?>" <?= $is_locked?'readonly':'' ?>></div>
                <div class="col-md-6 mb-3"><label>Date of Employment</label><input type="date" name="date_of_employment" class="form-control" value="<?= $details['date_of_employment']??'' ?>" <?= $is_locked?'readonly':'' ?>></div>
            </div>
            <div class="mb-3"><label>Qualifications</label><textarea name="qualifications" class="form-control" rows="3" <?= $is_locked?'readonly':'' ?>><?= $details['qualifications']??'' ?></textarea></div>
            
            <?php if(!$is_locked): ?>
            <div class="mb-4"><label>Photo Upload</label><input type="file" name="photo" class="form-control" accept="image/jpeg, image/png"></div>
            <button type="submit" name="action" value="draft" class="btn btn-secondary">Save as Draft</button>
            <button type="submit" name="action" value="submit" class="btn btn-primary" onclick="return confirm('Submit for final review? You cannot edit after this.');">Final Submit</button>
            <?php else: ?>
                <?php if($details['photo_path']): ?>
                    <div class="mb-3"><img src="../uploads/staff_photos/<?= $details['photo_path'] ?>" width="150" class="img-thumbnail"></div>
                <?php endif; ?>
            <?php endif; ?>
        </form>
    </div>
</div>
<?php include '../includes/footer.php'; ?>