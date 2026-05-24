<?php
header('Content-Type: application/json');
$db = new SQLite3(__DIR__ . '/../db/mtk-mina.sqlite');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = [];
    $result = $db->query('SELECT * FROM paintings ORDER BY title');
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = $row;
    }
    echo json_encode(['ok' => true, 'paintings' => $rows]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $stmt = $db->prepare('INSERT INTO paintings (id,title,image,price,currency,status,medium,size,year,collection,description) VALUES (:id,:title,:image,:price,:currency,:status,:medium,:size,:year,:collection,:description)');
    $stmt->bindValue(':id', $input['id'] ?? uniqid('mina-'), SQLITE3_TEXT);
    $stmt->bindValue(':title', $input['title'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':image', $input['image'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':price', $input['price'] ?? 0, SQLITE3_FLOAT);
    $stmt->bindValue(':currency', $input['currency'] ?? 'USD', SQLITE3_TEXT);
    $stmt->bindValue(':status', $input['status'] ?? 'available', SQLITE3_TEXT);
    $stmt->bindValue(':medium', $input['medium'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':size', $input['size'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':year', $input['year'] ?? date('Y'), SQLITE3_INTEGER);
    $stmt->bindValue(':collection', $input['collection'] ?? '', SQLITE3_TEXT);
    $stmt->bindValue(':description', $input['description'] ?? '', SQLITE3_TEXT);
    $stmt->execute();
    echo json_encode(['ok' => true]);
    exit;
}

if ($method === 'DELETE') {
    $stmt = $db->prepare('DELETE FROM paintings WHERE id = :id');
    $stmt->bindValue(':id', $input['id'] ?? '', SQLITE3_TEXT);
    $stmt->execute();
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
