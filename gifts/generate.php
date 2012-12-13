<?php

header('Content-Type: image/jpeg');
header('Content-Disposition: attachment; filename="rolling-jubilee-ecard.jpg"');

$image_number = $_GET['image_number'];
$recipient_name = substr($_GET['recipient_name'], 0, 60);
$first_name = substr($_GET['first_name'], 0, 60);
$amount = intval($_GET['amount']);
generate_card($image_number, $recipient_name, $first_name, $amount);

/**
 * Generates the ad image. If we pass a filename it'll save the image, otherwise it's streamed.
 */
function generate_card($image_number, $recipient_name, $first_name, $amount, $filename = NULL){

  if(!empty($image_number)){

    $image = ImageCreateFromjpeg('http://rollingjubilee.org/assets/img/ecard_' . $image_number . '_full.jpg');

    // coordinates of where the text will be placed over the image
    $x=1924;
    $y=476;
    $angle = 0;
    $fontsize  = 40;
    $fontfile = '../assets/fonts/milonga/Milonga-Regular.ttf';
    $black = imagecolorallocate($image, 0, 0, 0);

    $text = "Dear $recipient_name,

In your name, I have erased $$amount of medical debts for someone who could no longer pay them.

Together, we're taking part in a nationwide movement to buy debts for pennies on the dollar, before they get to debt collectors.

To learn more about this project, please visit rollingjubilee.org.

Happy Holidays!
$first_name";
    $text = wordwrap($text, 50, "\n", true);

    // write text to the image using all the parameters above
    imagettftext($image, $fontsize, $angle, $x, $y, $black, $fontfile, $text);

    // if we're saving the image, use the highest quality. if we're just previewing it, use crappier quality
    $quality = 100;

    // output the jpg
    imagejpeg($image, $filename, $quality);

    // free up memory
    imagedestroy($image);

  }

}

?>