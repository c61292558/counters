import GObject from "gi://GObject";

import { Chart } from "./chart.js";
import { DaysRow } from "./days_row.js";
import { Dialog } from "./dialog.js";
import { HistoryCard } from "./history_card.js";
import { InnerPage } from "./inner_page.js";
import { ListBox } from "./list_box.js";
import { MainPage } from "./main_page.js";
import { Preferences } from "./preferences.js";
import { ProgressRing } from "./progress_ring.js";
import { Row } from "./row.js";
import { Window } from "./window.js";

function ensureWidgets() {
  GObject.type_ensure(Chart.$gtype);
  GObject.type_ensure(DaysRow.$gtype);
  GObject.type_ensure(Dialog.$gtype);
  GObject.type_ensure(HistoryCard.$gtype);
  GObject.type_ensure(InnerPage.$gtype);
  GObject.type_ensure(ListBox.$gtype);
  GObject.type_ensure(MainPage.$gtype);
  GObject.type_ensure(Preferences.$gtype);
  GObject.type_ensure(ProgressRing.$gtype);
  GObject.type_ensure(Row.$gtype);
  GObject.type_ensure(Window.$gtype);
}

ensureWidgets();
