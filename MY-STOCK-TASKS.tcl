#!/usr/bin/env tclsh

# MY-STOCK-TASKS
# Requires: Tcl 8.6+, curl, and jq.

set WATCHLIST {
    AAPL AFRM AMD AMZN AVGO AXP BA BLK CAT COIN COP COST CVX GD GOOG GS HD HOOD JPM
    LMT MA MCD META MRVL MSFT MU NFLX NOC NVDA ORCL OXY PYPL QQQ RTX SHEL SHW SKHY
    SNOW SPCX SPY TSLA UNH V XOM
}

proc require_command {name} {
    if {[auto_execok $name] eq ""} {
        error "Required command not found: $name"
    }
}

proc yahoo_rows {symbol} {
    set encoded [string map {% %25 ^ %5E / %2F = %3D & %26 ? %3F " " %20} $symbol]
    set url "https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=4mo&interval=1d&events=history&includeAdjustedClose=false"

    set json [exec curl \
		  --fail \
		  --silent \
		  --show-error \
		  --location \
		  --retry 3 \
		  --connect-timeout 15 \
		  --max-time 45 \
		  --user-agent "Mozilla/5.0 MY-STOCK-TASKS/1.0" \
		  $url]

    set jq_filter {
        .chart.result[0] as $r
        | if $r == null then empty else
	[range(0; ($r.timestamp | length))
	 | {
	     timestamp: $r.timestamp[.],
	     low: $r.indicators.quote[0].low[.],
	     close: $r.indicators.quote[0].close[.]
	 }
	 | select(.timestamp != null and .low != null and .close != null)
	 | [.timestamp, .low, .close]
	 | @tsv]
	| .[]
	end
    }

    set tsv [exec jq -r $jq_filter << $json]
    set rows {}

    foreach line [split [string trim $tsv] "\n"] {
        if {$line eq ""} {
            continue
        }

        lassign [split $line "\t"] timestamp low close
        if {$timestamp eq "" || $low eq "" || $close eq ""} {
            continue
        }

        lappend rows [dict create \
			  timestamp [expr {wide($timestamp)}] \
			  low [expr {double($low)}] \
			  close [expr {double($close)}]]
    }

    return $rows
}

proc week_key {timestamp} {
    # Monday-based trading-week key in U.S. Eastern time.
    set weekday [clock format $timestamp -timezone America/New_York -format %u]
    set monday [clock add $timestamp [expr {1 - $weekday}] days]
    return [clock format $monday -timezone America/New_York -format %Y-%m-%d]
}

proc month_key {timestamp} {
    return [clock format $timestamp -timezone America/New_York -format %Y-%m]
}

proc minimum_low_for_key {rows key_proc target_key} {
    set found 0
    set minimum 0.0

    foreach row $rows {
        set timestamp [dict get $row timestamp]
        if {[$key_proc $timestamp] ne $target_key} {
            continue
        }

        set low [dict get $row low]
        if {!$found || $low < $minimum} {
            set minimum $low
            set found 1
        }
    }

    if {!$found} {
        return ""
    }

    return $minimum
}

proc previous_completed_key {rows key_proc} {
    if {[llength $rows] == 0} {
        return ""
    }

    set latest_row [lindex $rows end]
    set current_key [$key_proc [dict get $latest_row timestamp]]
    set keys {}

    foreach row $rows {
        set key [$key_proc [dict get $row timestamp]]
        if {$key ne $current_key && [lsearch -exact $keys $key] < 0} {
            lappend keys $key
        }
    }

    if {[llength $keys] == 0} {
        return ""
    }

    return [lindex [lsort $keys] end]
}

proc signal_compare {a b} {
    set order [dict create W 0 M 1]
    set a_signal [dict get $a Buy]
    set b_signal [dict get $b Buy]

    set a_order [dict get $order $a_signal]
    set b_order [dict get $order $b_signal]

    if {$a_order < $b_order} {
        return -1
    }
    if {$a_order > $b_order} {
        return 1
    }

    return [string compare [dict get $a Ticker] [dict get $b Ticker]]
}

proc format_price {value} {
    if {$value eq ""} {
        return ""
    }
    return [format %.2f $value]
}

proc print_results {results} {
    if {[llength $results] == 0} {
        puts "NOTHING TO REPORT!"
        return
    }

    set headers {Ticker Current Last-Week Last-Month Buy}
    set widths [dict create Ticker 6 Current 7 Last-Week 9 Last-Month 10 Buy 3]

    foreach row $results {
        foreach header $headers {
            set value [dict get $row $header]
            set length [string length $value]
            if {$length > [dict get $widths $header]} {
                dict set widths $header $length
            }
        }
    }

    set format_string [format "%%-%ds  %%%ds  %%%ds  %%%ds  %%-%ds" \
			   [dict get $widths Ticker] \
			   [dict get $widths Current] \
			   [dict get $widths Last-Week] \
			   [dict get $widths Last-Month] \
			   [dict get $widths Buy]]

    puts ""
    puts [format $format_string {*}$headers]

    foreach row $results {
        puts [format $format_string \
		  [dict get $row Ticker] \
		  [dict get $row Current] \
		  [dict get $row Last-Week] \
		  [dict get $row Last-Month] \
		  [dict get $row Buy]]
    }
    puts ""
}

require_command curl
require_command jq

set results {}

foreach symbol $WATCHLIST {
    if {[catch {
        set rows [yahoo_rows $symbol]
        if {[llength $rows] == 0} {
            continue
        }

        set latest [lindex $rows end]
        set current [dict get $latest close]

        set previous_week [previous_completed_key $rows week_key]
        set previous_month [previous_completed_key $rows month_key]

        set week_low ""
        if {$previous_week ne ""} {
            set week_low [minimum_low_for_key $rows week_key $previous_week]
        }

        set month_low ""
        if {$previous_month ne ""} {
            set month_low [minimum_low_for_key $rows month_key $previous_month]
        }

        set week_buy [expr {$week_low ne "" && $current < $week_low}]
        set month_buy [expr {$month_low ne "" && $current < $month_low}]

        # Month Buy takes precedence over Week Buy.
        if {$month_buy} {
            set buy M
            set display_week ""
            set display_month [format_price $month_low]
        } elseif {$week_buy} {
            set buy W
            set display_week [format_price $week_low]
            set display_month ""
        } else {
            continue
        }

        lappend results [dict create \
			     Ticker $symbol \
			     Current [format_price $current] \
			     Last-Week $display_week \
			     Last-Month $display_month \
			     Buy $buy]
    } error_message options]} {
        puts stderr "$symbol: $error_message"
    }
}

set results [lsort -command signal_compare $results]
print_results $results
