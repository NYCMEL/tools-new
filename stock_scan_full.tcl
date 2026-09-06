#!/usr/bin/env tclsh

# Tcl 8.6+, curl and jq. PDF generation is built in.
set WATCHLIST {
    AAPL ABNB ADI AFRM ALAB AMAT AMD AMGN AMZN ARM ASML AVGO AXP BA BKR BLK
    CAT COIN COP COST CRWD CSCO CSX CVX DDOG DXCM FANG FTNT GD GOOG GOOGL GS
    HD HON HOOD INTC JNJ JPM KLAC KO LITE LMT LRCX MA MCD META MMM MPWR MRK
    MRVL MSFT MU NBIS NFLX NOC NVDA ORCL OXY PANW PYPL QQQ RTX SHEL SHW SKHY
    SNDK SNOW SPCX SPY STX TER TRV TSLA TXN UNH V WDC XOM
}
set HISTORY_RANGE 5y
set MAX_RECOVERY_DAYS 40
set MIN_ANALOGS 3

proc require_command n {
    if {[auto_execok $n] eq ""} {error "Required command not found: $n"}
}
proc yahoo_rows s {
    set e [string map {% %25 ^ %5E / %2F " " %20} $s]
    set u "https://query1.finance.yahoo.com/v8/finance/chart/${e}?range=$::HISTORY_RANGE&interval=1d&events=history&includeAdjustedClose=true"
    set j [exec curl --fail --silent --show-error --location --retry 3 --connect-timeout 15 --max-time 45 --user-agent "Mozilla/5.0 MY-STOCK-TASKS/2.0" $u]
    set f {
	.chart.result[0] as $r | if $r == null then empty else
	($r.indicators.quote[0]) as $q |
	($r.indicators.adjclose[0].adjclose // $q.close) as $a |
	[range(0;($r.timestamp|length)) |
	 {t:$r.timestamp[.],l:$q.low[.],c:$q.close[.],a:$a[.]} |
	 select(.t!=null and .l!=null and .c!=null and .a!=null and .c!=0) |
	 [.t,(.l*(.a/.c)),.a] | @tsv] | .[] end
    }
    set out {}
    foreach line [split [string trim [exec jq -r $f << $j]] "\n"] {
	if {$line eq ""} continue
	lassign [split $line "\t"] t l c
	lappend out [dict create timestamp [expr {wide($t)}] low [expr {double($l)}] close [expr {double($c)}]]
    }
    return $out
}
proc week_key t {
    set d [clock format $t -timezone America/New_York -format %u]
    return [clock format [clock add $t [expr {1-$d}] days] -timezone America/New_York -format %Y-%m-%d]
}
proc month_key t {clock format $t -timezone America/New_York -format %Y-%m}
proc previous_key {rows keyproc} {
    set cur [$keyproc [dict get [lindex $rows end] timestamp]]
    set keys {}
    foreach r $rows {
	set k [$keyproc [dict get $r timestamp]]
	if {$k ne $cur && [lsearch -exact $keys $k]<0} {lappend keys $k}
    }
    if {![llength $keys]} {return ""}
    return [lindex [lsort $keys] end]
}
proc keyed_low {rows keyproc target} {
    set found 0
    foreach r $rows {
	if {[$keyproc [dict get $r timestamp]] ne $target} continue
	set v [dict get $r low]
	if {!$found || $v<$low} {set low $v; set found 1}
    }
    if {!$found} {return ""}
    return $low
}
proc max_close {v a b} {
    set m [lindex $v $a]
    for {set i [expr {$a+1}]} {$i<=$b} {incr i} {
	if {[lindex $v $i]>$m} {set m [lindex $v $i]}
    }
    return $m
}
proc median v {
    set v [lsort -real $v]; set n [llength $v]; set m [expr {$n/2}]
    if {$n%2} {return [lindex $v $m]}
    return [expr {([lindex $v [expr {$m-1}]]+[lindex $v $m])/2.0}]
}
proc estimate_recovery rows {
    set n [llength $rows]
    if {$n<100} {return ""}
    set c {}
    foreach r $rows {lappend c [dict get $r close]}
    set h {}
    for {set i 0} {$i<$n} {incr i} {lappend h [max_close $c [expr {max(0,$i-19)}] $i]}
    set target [lindex $h end]; set current [lindex $c end]
    set dd [expr {$current/$target-1.0}]
    if {$dd>=0} {return [dict create weeks 1 probability 100 analogs 0 confidence N/A drawdown 0 target $target]}
    set mag [expr {abs($dd)}]
    set tol [expr {max(.015,$mag*.35)}]
    set lo [expr {max(.01,$mag-$tol)}]; set hi [expr {$mag+$tol}]
    set events 0; set recovered {}; set last [expr {-$::MAX_RECOVERY_DAYS}]
    for {set i 20} {$i<$n-$::MAX_RECOVERY_DAYS-1} {incr i} {
	set hd [expr {1.0-[lindex $c $i]/[lindex $h $i]}]
	set pd [expr {1.0-[lindex $c [expr {$i-1}]]/[lindex $h [expr {$i-1}]]}]
	if {$hd<$lo || $hd>$hi} continue
	if {($pd>=$lo && $pd<=$hi)||$i-$last<$::MAX_RECOVERY_DAYS} continue
	incr events; set last $i
	for {set j [expr {$i+1}]} {$j<=min($n-1,$i+$::MAX_RECOVERY_DAYS)} {incr j} {
	    if {[lindex $c $j]>=[lindex $h $i]} {lappend recovered [expr {$j-$i}]; break}
	}
    }
    if {!$events} {return ""}
    set p [expr {round(100.0*[llength $recovered]/$events)}]
    if {[llength $recovered]} {
	set w [expr {max(1,min(8,round([median $recovered]/5.0)))}]
    } else {set w 8}
    if {$events>=8 && $p>=65} {set conf HIGH
    } elseif {$events>=$::MIN_ANALOGS && $p>=45} {set conf MEDIUM
    } else {set conf LOW}
    return [dict create weeks $w probability $p analogs $events confidence $conf drawdown [expr {$dd*100}] target $target]
}
proc money v {format "\$%.2f" $v}
proc result_values r {
    set e [dict get $r Estimate]
    if {$e eq ""} {
	return [list [dict get $r Signal] [dict get $r Ticker] [money [dict get $r Current]] N/A N/A 0 LOW N/A N/A]
    }
    return [list [dict get $r Signal] [dict get $r Ticker] [money [dict get $r Current]] \
		"[dict get $e weeks] week(s)" "[dict get $e probability]%" [dict get $e analogs] \
		[dict get $e confidence] "[format %.1f [dict get $e drawdown]]%" [money [dict get $e target]]]
}
proc compare_results {a b} {
    set oa [expr {[dict get $a Signal] eq "WEEK BUY"?0:1}]
    set ob [expr {[dict get $b Signal] eq "WEEK BUY"?0:1}]
    if {$oa!=$ob} {return [expr {$oa<$ob?-1:1}]}
    string compare [dict get $a Ticker] [dict get $b Ticker]
}
proc print_results rows {
    if {![llength $rows]} {puts "NOTHING TO REPORT!"; return}
    set fmt "%-9s %-7s %9s %-9s %11s %7s %-10s %9s %9s"
    puts ""; puts [format $fmt Signal Ticker Current Recovery Probability Analogs Confidence Drawdown Target]
    foreach r $rows {puts [format $fmt {*}[result_values $r]]}
    puts ""
}

# Small native PDF writer. Uses standard Helvetica fonts.
proc pdf_escape s {string map [list "\\" "\\\\" "(" "\\(" ")" "\\)"] $s}
proc pdf_text {x y size s {bold 0}} {
    set f [expr {$bold?"F2":"F1"}]
    format "BT /%s %.1f Tf %.1f %.1f Td (%s) Tj ET\n" $f $size $x $y [pdf_escape $s]
}
proc pdf_page {rows page pages generated} {
    set s "0.09 0.20 0.30 rg\n"
    append s [pdf_text 30 570 18 "Stock Pullback and Recovery Report" 1]
    append s "0.33 0.39 0.45 rg\n" [pdf_text 30 550 8 "Generated $generated | Recovery target: prior 20-session high | History: 5 years"]
    set cols {{Signal 30} {Ticker 102} {Current 150} {Recovery 218} {8-Week-Prob 296} {Analogs 386} {Confidence 438} {Drawdown 514} {Target 584}}
    append s "0.09 0.20 0.30 rg 30 508 624 26 re f\n"
    foreach col $cols {lassign $col label x; append s "1 1 1 rg\n" [pdf_text [expr {$x+4}] 518 7.5 $label 1]}
    set y 486; set i 0
    foreach r $rows {
	if {$i%2} {append s "0.95 0.97 0.98 rg 30 [expr {$y-7}] 624 22 re f\n"}
	append s "0.12 0.16 0.20 rg\n"
	foreach col $cols val [result_values $r] {lassign $col label x; append s [pdf_text [expr {$x+4}] $y 7.5 $val]}
	append s "0.72 0.76 0.80 RG 0.4 w 30 [expr {$y-8}] m 654 [expr {$y-8}] l S\n"
	incr y -22; incr i
    }
    append s "0.33 0.39 0.45 rg\n" [pdf_text 30 36 7 "Historical estimates are informational and are not guarantees or investment advice."]
    append s [pdf_text 710 36 7 "Page $page of $pages"]
    return $s
}
proc write_pdf {path streams} {
    set n [llength $streams]; set kids {}
    for {set i 0} {$i<$n} {incr i} {lappend kids "[expr {5+2*$i}] 0 R"}
    set o [list "" "<< /Type /Catalog /Pages 2 0 R >>" "<< /Type /Pages /Count $n /Kids \[[join $kids " "]\] >>" \
	       "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"]
    for {set i 0} {$i<$n} {incr i} {
	set p [expr {5+2*$i}]; set c [expr {$p+1}]; set stream [lindex $streams $i]
	lappend o "<< /Type /Page /Parent 2 0 R /MediaBox \[0 0 792 612\] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents $c 0 R >>"
	lappend o "<< /Length [string bytelength $stream] >>\nstream\n${stream}endstream"
    }
    set f [open $path wb]; fconfigure $f -translation binary -encoding binary
    puts -nonewline $f "%PDF-1.4\n"; set offsets {0}
    for {set i 1} {$i<[llength $o]} {incr i} {
	lappend offsets [tell $f]; puts -nonewline $f "$i 0 obj\n[lindex $o $i]\nendobj\n"
    }
    set x [tell $f]; set count [llength $o]
    puts -nonewline $f "xref\n0 $count\n0000000000 65535 f \n"
    for {set i 1} {$i<$count} {incr i} {puts -nonewline $f [format "%010d 00000 n \n" [lindex $offsets $i]]}
    puts -nonewline $f "trailer\n<< /Size $count /Root 1 0 R >>\nstartxref\n$x\n%%EOF\n"; close $f
}
proc create_pdf rows {
    if {[info exists ::env(HOME)] && [file isdirectory [file join $::env(HOME) Downloads]]} {
	set dir [file join $::env(HOME) Downloads]
    } else {set dir [pwd]}
    set stamp [clock format [clock seconds] -format %Y-%m-%d_%H%M%S]
    set path [file join $dir "stock_scan_report_${stamp}.pdf"]
    set per 18; set total [llength $rows]; set pages [expr {max(1,int(ceil($total/double($per))))}]
    set streams {}; set generated [clock format [clock seconds] -format "%B %d, %Y at %I:%M %p"]
    for {set p 0} {$p<$pages} {incr p} {
	if {$total} {set part [lrange $rows [expr {$p*$per}] [expr {min($total-1,$p*$per+$per-1)}]]} else {set part {}}
	lappend streams [pdf_page $part [expr {$p+1}] $pages $generated]
    }
    write_pdf $path $streams
    return $path
}

require_command curl
require_command jq

proc analyze_symbol symbol {
    set rows [yahoo_rows $symbol]
    if {![llength $rows]} {return {}}
    set current [dict get [lindex $rows end] close]
    set wk [previous_key $rows week_key]; set mk [previous_key $rows month_key]
    set wl [expr {$wk eq "" ? "" : [keyed_low $rows week_key $wk]}]
    set ml [expr {$mk eq "" ? "" : [keyed_low $rows month_key $mk]}]
    set wb [expr {$wl ne "" && $current<$wl}]; set mb [expr {$ml ne "" && $current<$ml}]
    if {!$wb && !$mb} {return {}}
    set e [estimate_recovery $rows]
    set found {}
    if {$wb} {lappend found [dict create Signal "WEEK BUY" Ticker $symbol Current $current Estimate $e]}
    if {$mb} {lappend found [dict create Signal "MONTH BUY" Ticker $symbol Current $current Estimate $e]}
    return $found
}

set results {}
foreach symbol $WATCHLIST {
    if {[catch {set found [analyze_symbol $symbol]} msg opts]} {
	puts stderr "$symbol: $msg"
    } else {
	lappend results {*}$found
    }
}
set results [lsort -command compare_results $results]
print_results $results
puts "PDF CREATED: [create_pdf $results]"
