import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChildComponent } from '../child/child';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [CommonModule, FormsModule, ChildComponent],
  templateUrl: './parent.html',
  styleUrls: ['./parent.scss']
})

export class ParentComponent{
    userName: string = "";
    userAddress: string = "";
    userEmail: string = "";

    msgFromChild: string = "";
    msgToChild: string = "";

    isSubmitted: boolean = false;

    submitForm(): void{
        this.isSubmitted = true;
        this.msgFromChild = 'Msg sent to child'
    }

    handleChildmsg(message: string): void {
        this.msgFromChild = message
    }

}